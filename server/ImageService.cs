using Google.Cloud.Storage.V1;
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace game_galaxy_exchange.Server
{
    public class ImageService
    {
        private readonly StorageClient _storageClient;
        private readonly string _bucketName = "game-galaxy-exchange.appspot.com";

        public ImageService(StorageClient storageClient)
        {
            _storageClient = storageClient;
        }

        public async Task<string> SaveImageFirebase(int userId, IFormFile profilePicture,string path)
        {
            var fileName = $"{userId}_{Guid.NewGuid()}{Path.GetExtension(profilePicture.FileName)}";
            var filePath = $"{path}/{fileName}"; 

            using (var stream = new MemoryStream())
            {
                await profilePicture.CopyToAsync(stream);
                stream.Seek(0, SeekOrigin.Begin);

                var uploadObjectOptions = new UploadObjectOptions { PredefinedAcl = PredefinedObjectAcl.PublicRead };

                try
                {
                    var result = await _storageClient.UploadObjectAsync(_bucketName, filePath, null, stream, uploadObjectOptions);
                    return $"https://storage.googleapis.com/{_bucketName}/{filePath}";
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException("Failed to upload image to Firebase Storage", ex);
                }
            }
        }
    }
}
