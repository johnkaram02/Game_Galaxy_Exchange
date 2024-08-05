using FirebaseAdmin;
using game_galaxy_exchange.Server;
using game_galaxy_exchange.Server.Controllers;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Builder.Extensions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using static game_galaxy_exchange.Server.Model;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("https://localhost:7041");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "game_galaxy_exchange API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

builder.Services.AddDbContext<GameGalaxyExchangeContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 26))));


var credentialPath = Path.Combine(builder.Environment.ContentRootPath, "Credentials", "game-galaxy-exchange-firebase-adminsdk-gz29x-01b0d64413.json");
var credential = GoogleCredential.FromFile(credentialPath);

FirebaseApp.Create(new AppOptions
{
    Credential = credential
});

builder.Services.AddSingleton<StorageClient>(provider =>
{
    return StorageClient.Create(credential);
});

builder.Services.AddSingleton<ImageService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
});

builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity.Name ?? context.Request.Headers["X-Forwarded-For"].ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 1000,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 50
            }));
});

builder.Services.AddResponseCompression(options =>
{
    options.Providers.Add<GzipCompressionProvider>();
    options.EnableForHttps = true;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllOrigins",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "game_galaxy_exchange API V1");
        c.OAuthClientId("swaggerui");
        c.OAuthAppName("Swagger UI");
        c.RoutePrefix = string.Empty;
    });
    app.UseStaticFiles();
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();
app.UseHsts();
app.Use((context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "no-referrer");
    context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'; script-src 'self' https://trusted.cdn.com; style-src 'self' https://trusted.cdn.com; img-src 'self' data:; font-src 'self' https://trusted.cdn.com; frame-ancestors 'none'; form-action 'self';");
    return next();
});

app.UseRouting();
app.UseCors("AllowAllOrigins");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
