import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, TextField, Button, Card, CardContent, Avatar, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import './Profile.css';
import './App.css';

function Profile() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    const fetchProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`https://localhost:7041/Game_Galaxy/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUsername(data.username);
                setEmail(data.email);
                setPhoneNumber(data.phoneNumber);
                setAddress(data.address);
                setProfilePictureUrl(data.profilePictureUrl);
            } else {
                throw new Error('Failed to fetch profile');
            }
        } catch (error) {
            console.error('Error:', error);
            setError(error.message);
            localStorage.removeItem('token');
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [navigate]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('email', email);
        if (password.trim() !== '') {
            formData.append('password', password);
        }
        formData.append('phoneNumber', phoneNumber);
        formData.append('address', address);
        if (profilePictureFile) {
            formData.append('profilePicture', profilePictureFile);
        }

        try {
            const response = await fetch(`https://localhost:7041/Game_Galaxy/user/modify_profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                setSuccessMessage('Profile updated successfully.');
                if (profilePictureFile) {
                    const data = await response.json();
                    setProfilePictureUrl(data.profilePictureUrl);
                }
                fetchProfile();
            } else {
                throw new Error(`Failed to update profile: ${await response.text()}`);
            }
        } catch (error) {
            setError(`An error occurred while updating the profile: ${error.message}`);
        }
    };

    const handleProfilePictureChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setProfilePictureFile(file);
            setProfilePictureUrl(URL.createObjectURL(file));
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <img src="/Logo.png" alt="GameGalaxy Logo" className="loading-logo" />
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <Navbar />
            <Container maxWidth="sm">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 5 }}>
                    <Typography variant="h3" component="h1" gutterBottom>
                        Profile
                    </Typography>
                    <Card sx={{ width: '100%', mt: 3 }}>
                        <CardContent>
                            <Avatar
                                alt={username}
                                src={profilePictureUrl}
                                className="avatar-image"
                                sx={{ width: 100, height: 100, margin: 'auto' }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'default-image.jpg';
                                }}
                            />
                            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                            {successMessage && <Alert severity="success" sx={{ mt: 2 }}>{successMessage}</Alert>}
                            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                                <TextField
                                    margin="normal"
                                    fullWidth
                                    id="username"
                                    label="Username"
                                    name="username"
                                    autoComplete="username"
                                    autoFocus
                                    value={username}
                                    disabled
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="email"
                                    label="Email"
                                    type="email"
                                    id="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <TextField
                                    margin="normal"
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type="password"
                                    id="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <TextField
                                    margin="normal"
                                    fullWidth
                                    name="phoneNumber"
                                    label="Phone Number"
                                    type="tel"
                                    id="phoneNumber"
                                    autoComplete="phoneNumber"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                                <TextField
                                    margin="normal"
                                    fullWidth
                                    name="address"
                                    label="Address"
                                    type="text"
                                    id="address"
                                    autoComplete="address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                                <Button
                                    variant="contained"
                                    component="label"
                                    sx={{ mt: 2 }}
                                >
                                    Upload Profile Picture
                                    <input
                                        type="file"
                                        hidden
                                        onChange={handleProfilePictureChange}
                                    />
                                </Button>
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2 }}
                                >
                                    Update Profile
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Container>
        </div>
    );
}

export default Profile;
