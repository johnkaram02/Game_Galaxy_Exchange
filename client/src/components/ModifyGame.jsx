import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Pica from 'pica';
import { Container, TextField, Button, Typography, Paper, CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import Navbar from './Navbar';
import './ModifyGame.css';

const pica = Pica();

const ModifyGame = () => {
    const { gameId } = useParams();
    const [game, setGame] = useState({
        title: '',
        description: '',
        price: '',
        releaseDate: '',
        platform: '',
        condition: '',
        sold: false,
        quantity: 0,
        gamePictureURL: ''
    });
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [coverPhotoFile, setCoverPhotoFile] = useState(null);
    const [coverPhotoUrl, setCoverPhotoUrl] = useState('');

    useEffect(() => {
        fetchGameDetails();
        fetchPlatforms();
    }, []);

    const fetchGameDetails = () => {
        const token = localStorage.getItem('token');
        axios.get(`https://localhost:7041/Game_Galaxy/games/${gameId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                setGame(response.data);
                setCoverPhotoUrl(response.data.gamePictureURL);
                setLoading(false);
            })
            .catch(error => {
                setError('Failed to fetch game details: ' + error.message);
                setLoading(false);
            });
    };

    const fetchPlatforms = () => {
        const token = localStorage.getItem('token');

        axios.get('https://localhost:7041/Game_Galaxy/platforms/all', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                setPlatforms(response.data);
            })
            .catch(error => {
                if (error.response) {
                    setError(`Failed to fetch platforms: ${error.response.data}`);
                } else if (error.request) {
                    setError('Failed to fetch platforms: No response from server');
                } else {
                    setError('Failed to fetch platforms: ' + error.message);
                }
            });
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setGame(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handlePictureChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const resizedBlob = await resizeImage(file, 300, 300);
            setCoverPhotoFile(resizedBlob);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverPhotoUrl(reader.result);
            };
            reader.readAsDataURL(resizedBlob);
        }
    };

    const resizeImage = (file, width, height) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                pica.resize(img, canvas)
                    .then(result => pica.toBlob(result, 'image/png', 1.0))
                    .then(blob => resolve(blob))
                    .catch(error => reject(error));
            };
            img.onerror = error => reject(error);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        const selectedPlatform = platforms.find(platform => platform.name === game.platform);

        const gameUpdateData = new FormData();
        if (game.title) gameUpdateData.append('Title', game.title);
        if (game.description) gameUpdateData.append('Description', game.description);
        if (game.releaseDate) gameUpdateData.append('ReleaseDate', game.releaseDate);
        if (game.price) gameUpdateData.append('Price', game.price);
        if (game.condition) gameUpdateData.append('Condition', game.condition);
        gameUpdateData.append('Sold', game.sold);
        if (selectedPlatform) gameUpdateData.append('Platform_ID', selectedPlatform.id);
        if (game.quantity) gameUpdateData.append('quantity', game.quantity);

        try {
            await axios.put(`https://localhost:7041/Game_Galaxy/games/${gameId}`, gameUpdateData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setSuccessMessage('Game details updated successfully');

            if (coverPhotoFile) {
                const formData = new FormData();
                formData.append('gamePicture', coverPhotoFile);
                await axios.post(`https://localhost:7041/Game_Galaxy/games/${gameId}/upload-picture`, formData, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                setSuccessMessage('Game picture uploaded successfully');
            }
        } catch (error) {
            setError('Failed to update game details: ' + error.message);
        }
    };

    if (loading) {
        return <div className="loading"><CircularProgress /></div>;
    }

    if (error) {
        return <Alert severity="error" className="modify-game-alert">{error}</Alert>;
    }

    return (
        <>
            <Navbar />
            <Container className="modify-game-container" style={{ marginTop: '800px' }}>
                <Paper elevation={3} className="modify-game-paper">
                    <Typography variant="h4" component="h1" gutterBottom>Edit Game</Typography>
                    <form onSubmit={handleSubmit} className="modify-game-form">
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Title"
                            name="title"
                            id="title"
                            value={game.title}
                            onChange={handleChange}
                            className="modify-game-field"
                        />
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Description"
                            name="description"
                            id="description"
                            multiline
                            rows={4}
                            value={game.description}
                            onChange={handleChange}
                            className="modify-game-field"
                        />
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Price"
                            name="price"
                            id="price"
                            type="number"
                            value={game.price}
                            onChange={handleChange}
                            className="modify-game-field"
                        />
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Release Date"
                            name="releaseDate"
                            id="releaseDate"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={game.releaseDate}
                            onChange={handleChange}
                            className="modify-game-field"
                        />
                        <FormControl fullWidth margin="normal" className="modify-game-field">
                            <InputLabel id="platform-label">Platform</InputLabel>
                            <Select
                                labelId="platform-label"
                                id="platform"
                                name="platform"
                                value={game.platform}
                                onChange={handleChange}
                            >
                                {platforms.map(platform => (
                                    <MenuItem key={platform.id} value={platform.name}>
                                        {platform.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Condition"
                            name="condition"
                            id="condition"
                            value={game.condition}
                            onChange={handleChange}
                            className="modify-game-field"
                        />
                        <FormControl fullWidth margin="normal" className="modify-game-field">
                            <InputLabel id="sold-label">Sold</InputLabel>
                            <Select
                                labelId="sold-label"
                                id="sold"
                                name="sold"
                                value={game.sold}
                                onChange={handleChange}
                            >
                                <MenuItem value={true}>Yes</MenuItem>
                                <MenuItem value={false}>No</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Quantity"
                            name="quantity"
                            id="quantity"
                            type="number"
                            value={game.quantity}
                            onChange={handleChange}
                            className="modify-game-field"
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePictureChange}
                            className="modify-game-field"
                        />
                        {coverPhotoUrl && (
                            <div className="cover-photo-preview">
                                <Typography variant="h6">Cover Photo Preview:</Typography>
                                <img src={coverPhotoUrl} alt="Cover Preview" className="cover-photo" />
                            </div>
                        )}
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            className="modify-game-button"
                        >
                            Edit Game
                        </Button>
                    </form>
                    {successMessage && <Alert severity="success" className="modify-game-alert">{successMessage}</Alert>}
                </Paper>
            </Container>
        </>
    );
};

export default ModifyGame;
