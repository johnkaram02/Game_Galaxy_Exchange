import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Card, CardContent, Link, CircularProgress } from '@mui/material';
import { setTokens } from './auth';
import './Login.css';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [buttonStyle, setButtonStyle] = useState({});
    const navigate = useNavigate();

    const validate = () => {
        let tempErrors = {};
        tempErrors.username = username ? '' : 'Username is required.';
        tempErrors.password = password ? '' : 'Password is required.';
        setErrors(tempErrors);
        return Object.values(tempErrors).every(x => x === '');
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (validate()) {
            setLoading(true);
            try {
                const response = await fetch('https://localhost:7041/Game_Galaxy/user/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                if (response.ok) {
                    const data = await response.json();
                    setTokens({
                        token: data.token,
                        tokenExpiration: new Date(data.tokenExpiration).getTime(),
                        refreshToken: data.refreshToken,
                        refreshTokenExpiration: new Date(data.refreshTokenExpiration).getTime()
                    });
                    navigate('/main');
                } else {
                    const errorData = await response.json();
                    setErrors({ ...errors, server: errorData.message });
                    setButtonStyle({ backgroundColor: 'red', cursor: 'not-allowed' });
                }
            } catch (error) {
                console.error('Error:', error);
                setErrors({ ...errors, server: 'Login failed. Please try again later.' });
                setButtonStyle({ backgroundColor: 'red', cursor: 'not-allowed' });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleRegisterClick = () => {
        navigate('/register');
    };

    return (
        <div className="login-container">
            <Container component="main" maxWidth="xs">
                <Card sx={{ mt: 8, p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography component="h1" variant="h5" mb={2}>
                                Game Galaxy Exchange
                            </Typography>
                            <Typography variant="h6" mb={2}>
                                Login
                            </Typography>
                            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
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
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        setButtonStyle({});
                                    }}
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
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setButtonStyle({});
                                    }}
                                    error={!!errors.password}
                                    helperText={errors.password}
                                />
                                {errors.server && (
                                    <Typography color="error" align="center" mt={2}>
                                        {errors.server}
                                    </Typography>
                                )}
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 2, ...buttonStyle }}
                                    disabled={loading || buttonStyle.backgroundColor === 'red'}
                                >
                                    {loading ? <CircularProgress size={24} /> : 'Login'}
                                </Button>
                                <Typography variant="body2" color="textSecondary" align="center" mt={2}>
                                    Don't have an account?{' '}
                                    <Link component="button" variant="body2" onClick={handleRegisterClick}>
                                        Register
                                    </Link>
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </div>
    );
}

export default Login;
