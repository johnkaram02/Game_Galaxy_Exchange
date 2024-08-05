import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile_Page';
import ProtectedRoute from './components/ProtectedRoute';
import AddGamePage from './components/AddGamePage';
import MainPage from './components/MainPage';
import GameDetails from './components/GameDetails';
import SellerInventory from './components/SellerInventory';
import ModifyGame from './components/ModifyGame';
import Footer from './components/Footer';
import Wishlist from './components/Wishlist';
import SellerDashboard from './components/SellerDashboard';
import { getToken, isAuthenticated } from './components/auth';
import './App.css';

function App() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuthentication = async () => {
            if (isAuthenticated()) {
                try {
                    await getToken();
                    navigate('/main', { replace: true });
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    navigate('/login', { replace: true });
                }
            } else {
                navigate('/login', { replace: true });
            }
            setLoading(false);
        };

        checkAuthentication();
    }, []);

    if (loading) {
        return (
            <div className="loading-screen">
                <img src="/Logo.png" alt="GameGalaxy Logo" className="loading-logo" />
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to={isAuthenticated() ? "/main" : "/login"} />} />
            <Route path="/main" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
            <Route path="/add-game" element={<ProtectedRoute><AddGamePage /></ProtectedRoute>} />
            <Route path="/games/:gameId" element={<ProtectedRoute><GameDetails /></ProtectedRoute>} />
            <Route path="/seller-inventory" element={<ProtectedRoute><SellerInventory /></ProtectedRoute>} />
            <Route path="/seller-dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
            <Route path="/modify-game/:gameId" element={<ProtectedRoute><ModifyGame /></ProtectedRoute>} />
            <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/footer" element={<ProtectedRoute><Footer /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}

export default App;
