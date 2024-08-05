using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Reflection.Emit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.SqlServer;
using System.Text.Json.Serialization;
using System.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;

namespace game_galaxy_exchange.Server
{
    public class Model
    {

        public class GameGalaxyExchangeContext : DbContext
        {
            public GameGalaxyExchangeContext(DbContextOptions<GameGalaxyExchangeContext> options)
                : base(options)
            {
            }
            public DbSet<User> user { get; set; }
            public DbSet<Game> game { get; set; }
            public DbSet<Wishlist> wishlist { get; set; }
            public DbSet<Review> review { get; set; }
            public DbSet<SellerInventory> sellerInventory { get; set; }
            public DbSet<Platform> platform { get; set; }

            protected override void OnModelCreating(ModelBuilder modelBuilder)
            {
                modelBuilder.Entity<Game>()
                .Property(g => g.sold)
                .HasConversion<bool>();

            }

        }
        public class User
        {
            [Key]
            [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
            public int id { get; set; }
            public string username { get; set; }
            public string password { get; set; }
            public string email { get; set; }
            public DateTime registration_date { get; set; }
            public DateTime? last_login_date { get; set; }
            public string? profile_picture_url { get; set; }
            public string? phone_number { get; set; }
            public string address { get; set; }
            public ICollection<Wishlist> Wishlists { get; set; }
            public ICollection<Review> Reviews { get; set; }
            public ICollection<SellerInventory> SellerInventories { get; set; }
            public ICollection<Game> PublishedGames { get; set; }
        }

        public class Game
        {
            [Key]
            [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
            public int id { get; set; }
            public string title { get; set; }
            public string description { get; set; }
            public DateTime release_date { get; set; }
            public int publisher_id { get; set; }
            public int price { get; set; }
            public string condition { get; set; }
            public DateTime last_update { get; set; }
            public bool sold { get; set; }
            public int platform_id { get; set; }
            public string game_picture_url { get; set; }

            public ICollection<Wishlist> Wishlists { get; set; }
            public ICollection<Review> Reviews { get; set; }
            public ICollection<SellerInventory> SellerInventories { get; set; }


            [ForeignKey("platform_id")]
            [JsonIgnore]
            public Platform Platform { get; set; }

            [ForeignKey("publisher_id")]
            [JsonIgnore]
            public User Publisher { get; set; }
        }

        public class Wishlist
        {
            [Key]
            [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
            public int id { get; set; }
            public int user_id { get; set; }
            public int game_id { get; set; }
            public DateTime date_added { get; set; }

            [ForeignKey("user_id")]
            [JsonIgnore]
            public User User { get; set; }
            [ForeignKey("game_id")]
            [JsonIgnore]
            public Game Game { get; set; }
        }

        public class Review
        {
            [Key]
            [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
            public int id { get; set; }
            public int user_id { get; set; }
            public int game_id { get; set; }
            public int rating { get; set; }
            public string comment { get; set; }
            public DateTime date_posted { get; set; }

            [ForeignKey("user_id")]
            [JsonIgnore]
            public User User { get; set; }
            [JsonIgnore]
            [ForeignKey("game_id")]
            public Game Game { get; set; }
        }

        public class SellerInventory
        {
            [Key]
            [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
            public int id { get; set; }
            public int user_id { get; set; }
            public int game_id { get; set; }
            public int quantity_available { get; set; }
            public int price { get; set; }
            public string condition { get; set; }

            [ForeignKey("user_id")]
            public User User { get; set; }
            [ForeignKey("game_id")]
            public Game Game { get; set; }
        }

        public class Platform
        {
            [Key]
            [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
            public int id { get; set; }
            public string name { get; set; }
            public ICollection<Game> Games { get; set; }
        }
       
    }
}
