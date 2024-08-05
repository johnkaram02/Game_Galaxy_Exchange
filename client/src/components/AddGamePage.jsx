import React, { useState, useEffect } from 'react';
import Pica from 'pica';
import Navbar from './Navbar';
import './AddGame.css';

const token = localStorage.getItem('token');
const AddGamePage = () => {
    const [gameData, setGameData] = useState({
        title: '',
        releaseDate: '',
        description: '',
        price: '',
        condition: 'New',
        platformId: '',
        quantity: 1
    });
    const [platforms, setPlatforms] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
    const [coverPhotoFile, setCoverPhotoFile] = useState(null);

    useEffect(() => {
        const fetchPlatforms = async () => {
            const token = localStorage.getItem('token');

            try {
                const response = await fetch('https://localhost:7041/Game_Galaxy/platforms/all', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error('Error fetching platforms');
                }
                const data = await response.json();
                setPlatforms(data);
            } catch (error) {
                console.error('Error fetching platforms:', error);
                if (error.name === 'TypeError') {
                    setErrorMessage('Failed to fetch platforms: No response from server');
                } else {
                    setErrorMessage(`Failed to fetch platforms: ${error.message}`);
                }
            }
        };

        fetchPlatforms();
    }, []);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setGameData((prevGameData) => ({
            ...prevGameData,
            [name]: value,
        }));
    };

    const handleCoverPhotoChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            resizeImage(file, 300, 300)
                .then((resizedBlob) => {
                    setCoverPhotoFile(resizedBlob);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setCoverPhotoUrl(reader.result);
                    };
                    reader.readAsDataURL(resizedBlob);
                })
                .catch((error) => {
                    console.error('Error resizing image:', error);
                    setErrorMessage('Error resizing image');
                });
        }
    };

    const resizeImage = (file, width, height) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const pica = Pica();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                pica.resize(img, canvas)
                    .then((result) => pica.toBlob(result, 'image/png', 1.0))
                    .then((resizedBlob) => {
                        resolve(resizedBlob);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            };
            img.onerror = (error) => {
                reject(error);
            };
        });
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('title', gameData.title);
        formData.append('releaseDate', gameData.releaseDate);
        formData.append('description', gameData.description);
        formData.append('price', gameData.price);
        formData.append('condition', gameData.condition);
        formData.append('platform_ID', gameData.platformId);
        formData.append('quantity', gameData.quantity);
        formData.append('Last_update', new Date().toISOString());
        if (coverPhotoFile) {
            formData.append('gamePicture', coverPhotoFile);
        }

        try {
            const response = await fetch('https://localhost:7041/Game_Galaxy/games/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            const responseData = await response.json();

            if (response.ok) {
                setGameData({
                    title: '',
                    releaseDate: '',
                    description: '',
                    price: '',
                    condition: 'New',
                    platformId: '',
                    quantity: 1
                });
                setCoverPhotoUrl('');
                setSuccessMessage('Game added successfully!');
                setErrorMessage('');
            } else {
                setSuccessMessage('');
                setErrorMessage(responseData.message || 'Failed to add game');
            }
        } catch (error) {
            console.error('Error:', error);
            setSuccessMessage('');
            setErrorMessage('Failed to add game');
        }
    };

    return (
        <div>
            <Navbar /> {}
            <div className="add-game-container">
                <div className="add-game-form">
                    <h2>Add New Game</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="title">Title</label>
                            <input
                                type="text"
                                className="form-control"
                                id="title"
                                name="title"
                                value={gameData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="releaseDate">Release Date</label>
                            <input
                                type="date"
                                className="form-control"
                                id="releaseDate"
                                name="releaseDate"
                                value={gameData.releaseDate}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                                className="form-control"
                                id="description"
                                name="description"
                                value={gameData.description}
                                onChange={handleChange}
                                rows="3"
                                required
                            ></textarea>
                        </div>
                        <div className="form-group">
                            <label htmlFor="price">Price</label>
                            <input
                                type="number"
                                className="form-control"
                                id="price"
                                name="price"
                                value={gameData.price}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="condition">Condition</label>
                            <input
                                type="text"
                                className="form-control"
                                id="condition"
                                name="condition"
                                value={gameData.condition}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="platformId">Platform</label>
                            <select
                                className="form-control"
                                id="platformId"
                                name="platformId"
                                value={gameData.platformId}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Platform</option>
                                {platforms.map((platform) => (
                                    <option key={platform.id} value={platform.id}>
                                        {platform.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="quantity">Quantity</label>
                            <input
                                type="number"
                                className="form-control"
                                id="quantity"
                                name="quantity"
                                value={gameData.quantity}
                                onChange={handleChange}
                                min="1"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Upload Cover Photo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleCoverPhotoChange}
                            />
                            {coverPhotoUrl && (
                                <img src={coverPhotoUrl} alt="Cover Preview" style={{ maxWidth: '100%', marginTop: '10px' }} />
                            )}
                        </div>
                        <button type="submit" className="btn btn-primary">Submit</button>
                    </form>
                    {successMessage && <p className="success-message">{successMessage}</p>}
                    {errorMessage && <p className="error-message">{errorMessage}</p>}
                </div>
            </div>
        </div>
    );
};

export default AddGamePage;
