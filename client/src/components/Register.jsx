import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Card, CardContent } from '@mui/material';
import './Register.css';

function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [errors, setErrors] = useState({});
    const [buttonStyle, setButtonStyle] = useState({});
    const navigate = useNavigate();

    const validate = () => {
        let tempErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        tempErrors.username = username ? '' : 'Username is required.';
        tempErrors.password = password ? '' : 'Password is required.';
        tempErrors.email = email ? '' : 'Email is required.';
        tempErrors.phoneNumber = phoneNumber ? '' : 'Phone Number is required.';
        tempErrors.address = address ? '' : 'Address is required.';

        if (email && !emailRegex.test(email)) {
            tempErrors.email = 'Invalid email address.';
            setButtonStyle({ backgroundColor: 'red', transform: 'translateX(10px)' });
        } else if (password && password.length < 6) {
            tempErrors.password = 'Password is too weak.';
            setButtonStyle({ backgroundColor: 'red', transform: 'translateX(-10px)' });
        } else {
            setButtonStyle({});
        }

        setErrors(tempErrors);
        return Object.values(tempErrors).every(x => x === '');
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (validate()) {
            try {
                const response = await fetch("https://localhost:7041/Game_Galaxy/user/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password: password, email, phoneNumber, address })
                });
                if (response.ok) {
                    alert("Registration successful");
                    navigate('/login');
                } else {
                    const errorData = await response.json();
                    alert("Registration failed: " + response.statusText + " " + (errorData?.message || ''));
                }
            } catch (error) {
                console.error("Error:", error);
            }
        }
    };

    const handleLoginClick = () => {
        navigate('/login');
    };

    return (
        <div className="register-container">
            <Container maxWidth="sm">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 5 }}>
                    <Typography variant="h3" component="h1" gutterBottom>
                        Game Galaxy Exchange
                    </Typography>
                    <Card sx={{ width: '100%', mt: 3, borderRadius: 2, boxShadow: 3 }}>
                        <CardContent>
                            <Typography variant="h5" component="h2" gutterBottom>
                                Register
                            </Typography>
                            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="username"
                                    label="Username"
                                    name="username"
                                    autoComplete="username"
                                    autoFocus
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    error={!!errors.username}
                                    helperText={errors.username}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type="password"
                                    id="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    error={!!errors.password}
                                    helperText={errors.password}
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
                                    error={!!errors.email}
                                    helperText={errors.email}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="phoneNumber"
                                    label="Phone Number"
                                    type="text"
                                    id="phoneNumber"
                                    autoComplete="phone-number"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    error={!!errors.phoneNumber}
                                    helperText={errors.phoneNumber}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="address"
                                    label="Address"
                                    type="text"
                                    id="address"
                                    autoComplete="address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    error={!!errors.address}
                                    helperText={errors.address}
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2, ...buttonStyle }}
                                >
                                    Register
                                </Button>
                                <Typography variant="body2" color="textSecondary" align="center">
                                    Already have an account?{' '}
                                    <Button onClick={handleLoginClick} variant="text">
                                        Login
                                    </Button>
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Container>
        </div>
    );
}

export default Register;
