using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using static game_galaxy_exchange.Server.Model;
using Microsoft.AspNetCore.Identity;

namespace game_galaxy_exchange.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class Game_GalaxyController : ControllerBase
    {
        private readonly GameGalaxyExchangeContext _context;
        private readonly IConfiguration _config;
        private readonly ILogger<Game_GalaxyController> _logger;
        private readonly ImageService _imageService;

        private static Dictionary<string, TokenInfo> tokenStore = new Dictionary<string, TokenInfo>();
        public Game_GalaxyController(GameGalaxyExchangeContext context, IConfiguration config, ILogger<Game_GalaxyController> logger, ImageService imageService)
        {
            _context = context;
            _config = config;
            _logger = logger;
            _imageService = imageService;
        }
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [HttpPost("user/register")]
        public async Task<IActionResult> Register(UserRegistrationModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userExists = await _context.user.AnyAsync(u => u.username == model.Username || u.email == model.Email);
            if (userExists)
            {
                var existingUser = await _context.user.FirstOrDefaultAsync(u => u.username == model.Username || u.email == model.Email);
                if (existingUser.username == model.Username)
                {
                    return Conflict("Username already exists.");
                }
                if (existingUser.email == model.Email)
                {
                    return Conflict("Email already exists.");
                }
            }

            var passwordHasher = new PasswordHasher<User>();
            var user = new User
            {
                username = model.Username,
                password = passwordHasher.HashPassword(null, model.password),
                email = model.Email,
                registration_date = DateTime.UtcNow.Date,
                phone_number = model.PhoneNumber,
                address = model.Address
            };

            _context.user.Add(user);

            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("User {Username} registered successfully at {Time}", user.username, DateTime.UtcNow);
                return StatusCode(StatusCodes.Status201Created, "User registered successfully.");
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "An error occurred while registering user {Username} at {Time}", user.username, DateTime.UtcNow);
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal server error. Please try again later.");
            }
        }

        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [HttpPost("user/login")]
        public async Task<IActionResult> Login(LoginModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _context.user.SingleOrDefaultAsync(u => u.username == model.Username);
            if (user == null)
            {
                _logger.LogWarning("Login attempt failed for non-existing user: {Username}", model.Username);
                return Unauthorized("Invalid username or password.");
            }

            var passwordHasher = new PasswordHasher<User>();
            var result = passwordHasher.VerifyHashedPassword(user, user.password, model.Password);
            if (result != PasswordVerificationResult.Success)
            {
                _logger.LogWarning("Invalid password attempt for user: {Username}", model.Username);
                return Unauthorized("Invalid username or password.");
            }

            user.last_login_date = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();

                var (token, tokenExpiration) = GenerateJwtToken(user);
                var (refreshToken, refreshTokenExpiration) = GenerateRefreshToken(user);

                tokenStore[user.username] = new TokenInfo
                {
                    Token = token,
                    RefreshToken = refreshToken,
                    Expiration = tokenExpiration
                };

                _logger.LogInformation("User {Username} logged in successfully at {Time}", user.username, DateTime.UtcNow);

                return Ok(new
                {
                    token,
                    tokenExpiration,
                    refreshToken,
                    refreshTokenExpiration
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while logging in user {Username} at {Time}", user.username, DateTime.UtcNow);
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal server error. Please try again later.");
            }
        }

        [HttpPost("user/refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] TokenRequestModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var username = model.Username;
            var refreshToken = model.RefreshToken;

            if (!tokenStore.TryGetValue(username, out var tokenInfo) || tokenInfo.RefreshToken != refreshToken)
            {
                _logger.LogWarning("Invalid refresh token attempt for user: {Username}", username);
                return Unauthorized("Invalid refresh token.");
            }

            var user = await _context.user.SingleOrDefaultAsync(u => u.username == username);
            if (user == null)
            {
                _logger.LogWarning("Refresh token attempt failed for non-existing user: {Username}", username);
                return Unauthorized("User not found.");
            }

            var (newToken, newTokenExpiration) = GenerateJwtToken(user);
            var (newRefreshToken, newRefreshTokenExpiration) = GenerateRefreshToken(user);

            tokenStore[username] = new TokenInfo
            {
                Token = newToken,
                RefreshToken = newRefreshToken,
                Expiration = newTokenExpiration
            };

            _logger.LogInformation("Refresh token issued for user: {Username}", username);

            return Ok(new
            {
                token = newToken,
                tokenExpiration = newTokenExpiration,
                refreshToken = newRefreshToken,
                refreshTokenExpiration = newRefreshTokenExpiration
            });
        }

        [HttpGet("user/profile")]
        public async Task<IActionResult> GetProfile()
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            var userProfile = await _context.user
                .AsNoTracking()
                .Where(u => u.id == userId)
                .Select(u => new {
                    Username = u.username,
                    Email = u.email,
                    PhoneNumber = u.phone_number,
                    Address = u.address,
                    ProfilePictureUrl = u.profile_picture_url
                })
                .FirstOrDefaultAsync();

            if (userProfile == null)
            {
                _logger.LogWarning("User with ID {UserId} not found.", userId);
                return NotFound("User not found.");
            }

            _logger.LogInformation("Profile accessed for user {UserId}", userId);
            return Ok(userProfile);
        }

        [HttpPut("user/modify_profile")]
        public async Task<IActionResult> UpdateProfile([FromForm] UpdateProfileModel model)
        {
            if (!ValidateToken(HttpContext, out int userId))
            {
                _logger.LogWarning("Token validation failed for user ID: {UserId}", userId);
                return Unauthorized("Invalid token.");
            }

            _logger.LogInformation("Received update profile request for user ID: {UserId}", userId);

            var user = await _context.user.FindAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("User with ID {UserId} not found.", userId);
                return NotFound("User not found.");
            }

            bool isUpdated = false;

            if (!string.IsNullOrEmpty(model.Email) && model.Email != user.email)
            {
                user.email = model.Email;
                isUpdated = true;
            }

            if (!string.IsNullOrEmpty(model.Password))
            {
                var passwordHasher = new PasswordHasher<User>();
                user.password = passwordHasher.HashPassword(user, model.Password);
                isUpdated = true;
            }

            if (!string.IsNullOrEmpty(model.PhoneNumber) && model.PhoneNumber != user.phone_number)
            {
                user.phone_number = model.PhoneNumber;
                isUpdated = true;
            }

            if (!string.IsNullOrEmpty(model.Address) && model.Address != user.address)
            {
                user.address = model.Address;
                isUpdated = true;
            }

            if (model.ProfilePicture != null)
            {
                try
                {
                    string profilePictureUrl = await _imageService.SaveImageFirebase(userId, model.ProfilePicture, "profile_pictures");
                    user.profile_picture_url = profilePictureUrl;
                    isUpdated = true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to upload profile picture for user ID {UserId}", userId);
                    return StatusCode(500, "Failed to upload profile picture");
                }
            }

            if (isUpdated)
            {
                try
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Profile updated successfully for user ID {UserId}", userId);
                    return Ok(new { message = "Profile updated successfully" });
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Failed to update profile for user ID {UserId}", userId);
                    return StatusCode(500, "Internal server error");
                }
            }

            _logger.LogInformation("No changes detected for user ID {UserId}", userId);
            return NoContent();
        }

        [HttpGet("games/all")]
        public async Task<IActionResult> GetAllGames(int page = 1, int perPage = 6)
        {
            try
            {
                if (!ValidateToken(HttpContext, out int userId))
                {
                    _logger.LogWarning("Token validation failed");
                    return Unauthorized("Invalid token.");
                }

                var wishlistGameIds = await _context.wishlist
                    .Where(w => w.user_id == userId)
                    .Select(w => w.game_id)
                    .ToListAsync();

                var gamesQuery = _context.game
                    .Include(g => g.Platform)
                    .Include(g => g.Publisher)
                    .Where(g => !wishlistGameIds.Contains(g.id) && !g.sold)
                    .OrderByDescending(g => g.release_date);

                var totalGames = await gamesQuery.CountAsync();

                var games = await gamesQuery
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .ToListAsync();

                var gamesDto = games.Select(g => new
                {
                    Id = g.id,
                    Title = g.title,
                    Description = g.description,
                    ReleaseDate = g.release_date,
                    Publisher = g.Publisher.username,
                    Platform = g.Platform.name,
                    Price = g.price,
                    Condition = g.condition,
                    LastUpdate = g.last_update,
                    Sold = g.sold,
                    GamePictureURL = g.game_picture_url,
                    IsInWishlist = wishlistGameIds.Contains(g.id)
                }).ToList();

                return Ok(new { games = gamesDto, totalGames });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve games");
                return StatusCode(500, "Failed to retrieve games");
            }
        }

        [HttpGet("games/search")]
        public async Task<IActionResult> SearchGames(string searchTerm, int page = 1, int perPage = 6)
        {
            try
            {
                if (!ValidateToken(HttpContext, out int userId))
                {
                    _logger.LogWarning("Token validation failed");
                    return Unauthorized("Invalid token.");
                }

                var wishlistGameIds = await _context.wishlist
                    .Where(w => w.user_id == userId)
                    .Select(w => w.game_id)
                    .ToListAsync();

                var wishlistGameIdsSet = new HashSet<int>(wishlistGameIds);

                var gamesQuery = _context.game
                    .Include(g => g.Platform)
                    .Include(g => g.Publisher)
                    .Where(g => g.title.Contains(searchTerm) && !wishlistGameIdsSet.Contains(g.id) && !g.sold)
                    .OrderByDescending(g => g.release_date);

                var totalGames = await gamesQuery.CountAsync();

                var games = await gamesQuery
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .ToListAsync();

                var gamesDto = games.Select(g => new
                {
                    Id = g.id,
                    Title = g.title,
                    Description = g.description,
                    ReleaseDate = g.release_date,
                    Publisher = g.Publisher.username,
                    Platform = g.Platform.name,
                    Price = g.price,
                    Condition = g.condition,
                    LastUpdate = g.last_update,
                    Sold = g.sold,
                    GamePictureURL = g.game_picture_url,
                    IsInWishlist = false
                }).ToList();

                return Ok(new { totalGames, games = gamesDto });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to search games");
                return StatusCode(500, "Failed to search games");
            }
        }


        private static bool IsInWishlist(int gameId, int userId, GameGalaxyExchangeContext context)
        {
            return context.wishlist.Any(w => w.game_id == gameId && w.user_id == userId);
        }

        [HttpPost]
        [Route("games/add")]
        public async Task<IActionResult> AddGame([FromForm] GameDTO gameDto)
        {
            if (!ValidateToken(HttpContext, out int userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            bool gameExists = await _context.game
                .AnyAsync(g => g.title == gameDto.Title && g.platform_id == gameDto.Platform_ID);

            if (gameExists)
            {
                return BadRequest(new { message = "A game with the same title and platform already exists." });
            }

            var platform = await _context.platform.FindAsync(gameDto.Platform_ID);
            var publisher = await _context.user.FindAsync(userId);

            if (platform == null || publisher == null)
            {
                return BadRequest(new { message = "Invalid platform or publisher." });
            }

            string gamePictureUrl = string.Empty;
            if (gameDto.GamePicture != null)
            {
                try
                {
                    gamePictureUrl = await _imageService.SaveImageFirebase(userId, gameDto.GamePicture, "games_pictures");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to upload game picture");
                    return StatusCode(500, "Failed to upload game picture");
                }
            }

            var game = new Game
            {
                title = gameDto.Title,
                description = gameDto.Description,
                release_date = gameDto.ReleaseDate,
                publisher_id = userId,
                price = gameDto.Price,
                condition = gameDto.Condition,
                last_update = DateTime.UtcNow,
                sold = false,
                platform_id = gameDto.Platform_ID,
                game_picture_url = gamePictureUrl
            };

            await _context.game.AddAsync(game);
            await _context.SaveChangesAsync();

            var sellerInventory = new SellerInventory
            {
                user_id = userId,
                game_id = game.id,
                quantity_available = (int)gameDto.quantity,
                price = gameDto.Price,
                condition = gameDto.Condition
            };

            await _context.sellerInventory.AddAsync(sellerInventory);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Game added successfully!" });
        }


        [HttpGet("games/{gameId}/reviews")]
        public async Task<ActionResult<IEnumerable<ReviewDTO>>> GetReviewsForGame(int gameId)
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            try
            {
                var reviews = await _context.review
                    .Where(r => r.game_id == gameId)
                    .Select(r => new ReviewDTO
                    {
                        Id = r.id,
                        UserId = r.user_id,
                        GameId = r.game_id,
                        Rating = r.rating,
                        Comment = r.comment,
                        DatePosted = r.date_posted,
                        UserName = r.User.username
                    })
                    .ToListAsync();

                if (reviews == null || reviews.Count == 0)
                {
                    return Ok(new List<ReviewDTO>());
                }

                return Ok(reviews);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve reviews for game with ID {GameId}", gameId);
                return StatusCode(500, "Internal server error");
            }
        }


        [HttpPost("games/{gameId}/reviews")]
        public async Task<ActionResult<ReviewDTO>> AddReview(int gameId, [FromBody] ReviewDTO reviewDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            try
            {
                var review = new Review
                {
                    game_id = gameId,
                    user_id = userId,
                    rating = reviewDto.Rating,
                    comment = reviewDto.Comment,
                    date_posted = DateTime.UtcNow
                };

                _context.review.Add(review);
                await _context.SaveChangesAsync();

                var user = await _context.user.FindAsync(userId);
                if (user != null)
                {
                    reviewDto.UserName = user.username;
                }

                return CreatedAtAction(nameof(GetReviewsForGame), new { gameId = gameId }, reviewDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to add review for game with ID {GameId}", gameId);
                return StatusCode(500, "Internal server error");
            }
        }
        [HttpGet("games/{id}")]
        public async Task<IActionResult> GetGame(int id)
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            try
            {
                var gameQuery = _context.game
                    .Include(g => g.Platform)
                    .Include(g => g.Publisher)
                    .Join(_context.sellerInventory,
                          g => g.id,
                          si => si.game_id,
                          (g, si) => new { Game = g, SellerInventory = si })
                    .FirstOrDefaultAsync(g => g.Game.id == id && g.SellerInventory.user_id == userId);

                var gameResult = await gameQuery;

                if (gameResult == null)
                {
                    _logger.LogWarning("Game with ID {GameId} not found or user {UserId} is not the owner.", id, userId);
                    return NotFound("Game not found.");
                }

                var gameDto = new
                {
                    Id = gameResult.Game.id,
                    Title = gameResult.Game.title,
                    Description = gameResult.Game.description,
                    ReleaseDate = gameResult.Game.release_date.ToString("yyyy-MM-dd"),
                    Publisher = gameResult.Game.Publisher.username,
                    Address = gameResult.Game.Publisher.address,
                    Number = gameResult.Game.Publisher.phone_number,
                    Platform = gameResult.Game.Platform.name,
                    Price = gameResult.Game.price,
                    Condition = gameResult.Game.condition,
                    Last_update = gameResult.Game.last_update,
                    Sold = gameResult.Game.sold,
                    GamePictureURL = gameResult.Game.game_picture_url,
                    IsInWishlist = IsInWishlist(gameResult.Game.id, userId, _context),
                    Quantity = gameResult.SellerInventory.quantity_available
                };

                return Ok(gameDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve game with ID {GameId} for user {UserId}", id, userId);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("games/{id}")]
        public async Task<IActionResult> UpdateGame(int id, [FromForm] ModifyGameDTO gameDto)
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var game = await _context.game.FindAsync(id);

                if (game == null)
                {
                    _logger.LogWarning("Game with ID {GameId} not found.", id);
                    return NotFound(new { message = "Game not found." });
                }

                if (game.publisher_id != userId)
                {
                    _logger.LogWarning("User {UserId} is not authorized to update game with ID {GameId}.", userId, id);
                    return Unauthorized(new { message = "You are not authorized to update this game." });
                }

                if (!string.IsNullOrEmpty(gameDto.Title)) game.title = gameDto.Title;
                if (!string.IsNullOrEmpty(gameDto.Description)) game.description = gameDto.Description;
                if (gameDto.ReleaseDate.HasValue) game.release_date = gameDto.ReleaseDate.Value;
                if (gameDto.Price.HasValue) game.price = gameDto.Price.Value;
                if (!string.IsNullOrEmpty(gameDto.Condition)) game.condition = gameDto.Condition;
                if (gameDto.Sold.HasValue) game.sold = gameDto.Sold.Value;
                if (gameDto.Platform_ID.HasValue) game.platform_id = gameDto.Platform_ID.Value;
                game.last_update = DateTime.UtcNow;

                var sellerInventory = await _context.sellerInventory.FirstOrDefaultAsync(si => si.game_id == game.id && si.user_id == userId);
                if (sellerInventory != null)
                {
                    if (gameDto.quantity.HasValue) sellerInventory.quantity_available = gameDto.quantity.Value;
                    if (gameDto.Price.HasValue) sellerInventory.price = gameDto.Price.Value;
                    if (!string.IsNullOrEmpty(gameDto.Condition)) sellerInventory.condition = gameDto.Condition;
                    _context.sellerInventory.Update(sellerInventory);
                }

                _context.game.Update(game);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Game with ID {GameId} updated successfully by user {UserId}.", id, userId);

                return Ok(new { message = "Game updated successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update game with ID {GameId} for user {UserId}.", id, userId);
                return StatusCode(500, "Internal server error");
            }
        }


        [HttpPost("games/{id}/upload-picture")]
        public async Task<IActionResult> UploadGamePicture(int id, [FromForm] IFormFile gamePicture)
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            if (gamePicture == null)
            {
                return BadRequest("No game picture uploaded.");
            }

            try
            {
                var game = await _context.game.FindAsync(id);

                if (game == null)
                {
                    _logger.LogWarning("Game with ID {GameId} not found.", id);
                    return NotFound(new { message = "Game not found." });
                }

                if (game.publisher_id != userId)
                {
                    _logger.LogWarning("User {UserId} is not authorized to update game with ID {GameId}.", userId, id);
                    return Unauthorized("You are not authorized to update this game.");
                }

                var gamePictureUrl = await _imageService.SaveImageFirebase(userId, gamePicture, "games_pictures");
                game.game_picture_url = gamePictureUrl;
                game.last_update = DateTime.UtcNow;

                _context.Entry(game).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Game picture uploaded successfully for game ID {GameId} by user {UserId}.", id, userId);

                return Ok(new { message = "Game picture uploaded successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload game picture for game ID {GameId} by user {UserId}.", id, userId);
                return StatusCode(500, "Failed to upload game picture");
            }
        }
        [HttpDelete("games/{gameId}/delete")]
        public async Task<IActionResult> DeleteGame(int gameId)
        {
            var game = await _context.game
                .Include(g => g.SellerInventories)  // Assuming SellerInventory is a navigation property
                .FirstOrDefaultAsync(g => g.id == gameId);

            if (game == null)
            {
                return NotFound($"Game with ID {gameId} not found.");
            }

            // Remove related seller inventory entry if it exists
            if (game.SellerInventories != null)
            {
                _context.sellerInventory.Remove((SellerInventory)game.SellerInventories);
            }

            // Remove the game itself
            _context.game.Remove(game);
            await _context.SaveChangesAsync();

            return NoContent(); // Returns a 204 No Content response
        }



        [HttpGet("platforms/all")]
        public async Task<IActionResult> GetAllPlatforms()
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            try
            {
                var platforms = await _context.platform
                    .Select(p => new
                    {
                        Id = p.id,
                        Name = p.name
                    })
                    .ToListAsync();

                if (platforms == null || !platforms.Any())
                {
                    _logger.LogWarning("No platforms found in the database.");
                    return NotFound("No platforms found.");
                }

                _logger.LogInformation("Platforms retrieved successfully for user ID {UserId}.", userId);
                return Ok(platforms);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve platforms for user ID {UserId}.", userId);
                return StatusCode(500, "Failed to retrieve platforms");
            }
        }


        [HttpPost("wishlist/add/{gameId}")]
        public async Task<IActionResult> AddToWishlist(int gameId)
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            var gameAndWishlistCheck = await _context.game
                .Where(g => g.id == gameId)
                .Select(g => new
                {
                    GameExists = true,
                    AlreadyInWishlist = _context.wishlist.Any(w => w.user_id == userId && w.game_id == gameId)
                })
                .FirstOrDefaultAsync();

            if (gameAndWishlistCheck == null || !gameAndWishlistCheck.GameExists)
            {
                return NotFound("Game not found.");
            }

            if (gameAndWishlistCheck.AlreadyInWishlist)
            {
                return Conflict("Game is already in the wishlist.");
            }

            var wishlistItem = new Wishlist
            {
                user_id = userId,
                game_id = gameId,
                date_added = DateTime.UtcNow
            };

            try
            {
                _context.wishlist.Add(wishlistItem);
                await _context.SaveChangesAsync();
                return Ok(wishlistItem);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to add game to wishlist");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpDelete("wishlist/remove/{gameId}")]
        public async Task<IActionResult> RemoveFromWishlist(int gameId)
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            var wishlistItem = await _context.wishlist
                .Where(w => w.user_id == userId && w.game_id == gameId)
                .Select(w => new { w.id })
                .FirstOrDefaultAsync();

            if (wishlistItem == null)
            {
                return NotFound("Game not found in wishlist.");
            }

            try
            {
                _context.wishlist.Remove(new Wishlist { id = wishlistItem.id });
                await _context.SaveChangesAsync();
                return Ok("Game removed from wishlist.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to remove game from wishlist");
                return StatusCode(500, "Internal server error");
            }
        }


        [HttpGet("wishlist")]
        public async Task<IActionResult> GetWishlist()
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }

            try
            {
                var wishlist = await _context.wishlist
                    .Where(w => w.user_id == userId)
                    .Select(w => new
                    {
                        Id = w.Game.id,
                        Title = w.Game.title,
                        Description = w.Game.description,
                        ReleaseDate = w.Game.release_date,
                        Publisher = w.Game.Publisher.username,
                        Platform = w.Game.Platform.name,
                        Price = w.Game.price,
                        Condition = w.Game.condition,
                        LastUpdate = w.Game.last_update,
                        Sold = w.Game.sold,
                        GamePictureURL = w.Game.game_picture_url,
                        IsInWishlist = true
                    })
                    .ToListAsync();

                if (!wishlist.Any())
                {
                    return Ok(new List<object>());
                }

                return Ok(wishlist);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve wishlist for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }


        [HttpGet("sellerInventory")]
        public async Task<IActionResult> GetSellerInventory(int page = 1, int perPage = 6)
        {
            try
            {
                int userId;
                if (!ValidateToken(HttpContext, out userId))
                {
                    _logger.LogWarning("Token validation failed");
                    return Unauthorized("Invalid token.");
                }

                var userExists = await _context.user.AnyAsync(u => u.id == userId);
                if (!userExists)
                {
                    return Unauthorized("You are not authorized to access this resource.");
                }

                var gamesQuery = _context.game
                    .Where(g => g.publisher_id == userId && !g.sold)
                    .Join(_context.sellerInventory,
                          g => g.id,
                          si => si.game_id,
                          (g, si) => new { Game = g, SellerInventory = si })
                    .Select(g => new
                    {
                        g.Game.id,
                        g.Game.title,
                        g.Game.description,
                        g.Game.release_date,
                        Publisher = g.Game.Publisher.username,
                        Platform = g.Game.Platform.name,
                        g.Game.price,
                        g.Game.condition,
                        g.Game.last_update,
                        g.Game.sold,
                        g.Game.game_picture_url,
                        g.SellerInventory.quantity_available
                    })
                    .OrderByDescending(g => g.release_date);

                var totalGames = await gamesQuery.CountAsync();

                var games = await gamesQuery
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .ToListAsync();

                return Ok(new { games, totalGames });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve seller inventory");
                return StatusCode(500, "Failed to retrieve seller inventory");
            }
        }

        [HttpGet("sales/total")]
        public async Task<IActionResult> GetTotalSales()
        {
            try
            {
                int userId;
                if (!ValidateToken(HttpContext, out userId))
                {
                    _logger.LogWarning("Token validation failed");
                    return Unauthorized("Invalid token.");
                }

                var totalSales = await _context.sellerInventory
                    .Where(si => si.user_id == userId)
                    .Join(_context.game,
                          si => si.game_id,
                          g => g.id,
                          (si, g) => new { si, g })
                    .Where(x => x.g.sold)
                    .SumAsync(x => x.si.price * x.si.quantity_available);

                return Ok(new { totalSales });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate total sales");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("sales/monthly")]
        public async Task<IActionResult> GetMonthlySales()
        {
            try
            {
                int userId;
                if (!ValidateToken(HttpContext, out userId))
                {
                    _logger.LogWarning("Token validation failed");
                    return Unauthorized("Invalid token.");
                }

                var currentMonth = DateTime.UtcNow.Month;
                var currentYear = DateTime.UtcNow.Year;

                var monthlySales = await _context.sellerInventory
                    .Where(si => si.user_id == userId)
                    .Join(_context.game,
                          si => si.game_id,
                          g => g.id,
                          (si, g) => new { si, g })
                    .Where(x => x.g.sold && x.g.last_update.Month == currentMonth && x.g.last_update.Year == currentYear)
                    .SumAsync(x => x.si.price * x.si.quantity_available);

                return Ok(new { monthlySales });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate monthly sales");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("inventory/status")]
        public async Task<IActionResult> GetInventoryStatus()
        {
            try
            {
                int userId;
                if (!ValidateToken(HttpContext, out userId))
                {
                    _logger.LogWarning("Token validation failed");
                    return Unauthorized("Invalid token.");
                }

                var inventory = await _context.sellerInventory
                                        .Where(si => si.user_id == userId)
                                        .Select(si => new { si.Game.title, si.quantity_available })
                                        .ToListAsync();
                return Ok(inventory);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve inventory status");
                return StatusCode(500, "Internal server error");
            }
        }



        [HttpGet("sales/platforms")]
        public async Task<IActionResult> GetBestSellingPlatforms()
        {
            int userId;
            if (!ValidateToken(HttpContext, out userId))
            {
                _logger.LogWarning("Token validation failed");
                return Unauthorized("Invalid token.");
            }
            var platformSales = await _context.game
                .Where(g => g.publisher_id == userId && g.sold)
                .GroupBy(g => g.Platform.name)
                .Select(g => new { name = g.Key, sales = g.Sum(x => x.price) })
                .ToListAsync();
            return Ok(platformSales);
        }


        [HttpGet("sales/trend")]
        public async Task<IActionResult> GetSalesTrend()
        {
            try
            {
                int userId;
                if (!ValidateToken(HttpContext, out userId))
                {
                    _logger.LogWarning("Token validation failed");
                    return Unauthorized("Invalid token.");
                }

                var salesTrend = await _context.game
                                         .Where(g => g.publisher_id == userId && g.sold == true)
                                         .GroupBy(g => new { g.last_update.Year, g.last_update.Month })
                                         .Select(g => new { month = $"{g.Key.Year}-{g.Key.Month}", totalSales = g.Sum(x => x.price) })
                                         .ToListAsync();
                return Ok(salesTrend);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve sales trend");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("reviews/average")]
        public async Task<IActionResult> GetAverageRating()
        {
            try
            {
                int userId;
                if (!ValidateToken(HttpContext, out userId))
                {
                    _logger.LogWarning("Token validation failed");
                    return Unauthorized("Invalid token.");
                }

                var averageRating = await _context.review
                    .Where(r => r.Game.publisher_id == userId)
                    .Select(r => (double?)r.rating)
                    .AverageAsync();

                if (averageRating == null)
                {
                    averageRating = 0.0;
                }

                return Ok(new { averageRating });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve average rating");
                return StatusCode(500, "Internal server error");
            }
        }


        private (string Token, DateTime Expiration) GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.id.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.id.ToString()),
                new Claim("randomClaim", Guid.NewGuid().ToString()),
                new Claim("publisher_id", user.id.ToString()),
            };
            var expiration = DateTime.UtcNow.AddYears(2);
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: expiration,
                signingCredentials: credentials);

            return (new JwtSecurityTokenHandler().WriteToken(token), expiration);
        }
        private (string Token, DateTime Expiration) GenerateRefreshToken(User userId)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:RefreshKey"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.UniqueName, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };
            var expiration = DateTime.UtcNow.AddYears(2);
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: expiration,
                signingCredentials: credentials);

            return (new JwtSecurityTokenHandler().WriteToken(token), expiration);
        }
        //private async Task<string> SaveImage(IFormFile profilePicture)
        //{
        //    var fileName = Guid.NewGuid().ToString() + Path.GetExtension(profilePicture.FileName);
        //    var uploadPath = Path.Combine("C:\\Users\\johnk\\Documents\\temporary1\\game_galaxy_exchange\\game_galaxy_exchange.client\\public", fileName);

        //    using (var stream = new FileStream(uploadPath, FileMode.Create))
        //    {
        //        await profilePicture.CopyToAsync(stream);
        //    }

        //    return $"/{fileName}";
        //}

        private bool ValidateToken(HttpContext httpContext, out int userId)
        {
            userId = 0;

            if (!httpContext.Request.Headers.TryGetValue("Authorization", out var authorizationHeader) ||
                string.IsNullOrEmpty(authorizationHeader) ||
                !authorizationHeader.ToString().StartsWith("Bearer "))
            {
                return false;
            }

            var token = authorizationHeader.ToString().Substring("Bearer ".Length).Trim();

            if (string.IsNullOrEmpty(token))
            {
                return false;
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var jwtToken = tokenHandler.ReadJwtToken(token);

                var expClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp);
                if (expClaim == null)
                {
                    return false;
                }

                var exp = long.Parse(expClaim.Value);
                var expirationTime = DateTimeOffset.FromUnixTimeSeconds(exp).UtcDateTime;
                if (expirationTime < DateTime.UtcNow)
                {
                    return false;
                }

                var userIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.UniqueName);
                if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out userId))
                {
                    return false;
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        public class UpdateProfileModel
        {
            public string? Email { get; set; }
            public string? Password { get; set; }
            public string? PhoneNumber { get; set; }
            public string? Address { get; set; }
            public IFormFile? ProfilePicture { get; set; }
        }


        public class UserRegistrationModel
        {
            public string Username { get; set; }
            public string password { get; set; }
            public string Email { get; set; }
            public string PhoneNumber { get; set; }
            public string Address { get; set; }
        }

        public class LoginModel
        {
            public string Username { get; set; }
            public string Password { get; set; }
        }
        public class TokenInfo
        {
            public string Token { get; set; }
            public string RefreshToken { get; set; }
            public DateTime Expiration { get; set; }
        }
        public class GameDTO
        {
            public int Id { get; set; }
            public int? quantity { get; set; }
            public string Title { get; set; }
            public string Description { get; set; }
            public DateTime ReleaseDate { get; set; }
            public int Publisher_ID { get; set; }
            public int Price { get; set; }
            public string Condition { get; set; }
            public DateTime Last_update { get; set; }
            public bool Sold { get; set; }
            public int Platform_ID { get; set; }
            public IFormFile GamePicture { get; set; }
        }
        public class ModifyGameDTO
        {
            public int? Id { get; set; }
            public int? quantity { get; set; } 
            public string? Title { get; set; }
            public string? Description { get; set; }
            public DateTime? ReleaseDate { get; set; }
            public int? Publisher_ID { get; set; }
            public int? Price { get; set; }
            public string? Condition { get; set; }
            public DateTime? Last_update { get; set; }
            public bool? Sold { get; set; }
            public int? Platform_ID { get; set; }
        }

        public class AddToWishlistDTO
        {
            public int UserId { get; set; }
            public int GameId { get; set; }
        }
        public class ReviewDTO
        {
            public int Id { get; set; }
            public int UserId { get; set; }
            public int GameId { get; set; }
            public int Rating { get; set; }
            public string Comment { get; set; }
            public DateTime DatePosted { get; set; }
            public string? UserName { get; set; }
        }


        public class TokenRequestModel
        {
            public string Username { get; set; }
            public string RefreshToken { get; set; }
        }

    }
}
