import React, { useState, useEffect } from 'react';
import GamesList from './GamesList';
import Navbar from './Navbar';
import axios from 'axios';
import '../App.css';

const Wishlist = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortTerm, setSortTerm] = useState({ attribute: '', order: '' });

    useEffect(() => {
        fetchWishlist();
    }, [sortTerm]);

    const fetchWishlist = async () => {
        try {
            setLoading(true);

            const response = await axios.get('https://localhost:7041/Game_Galaxy/wishlist', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }
            });

            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Invalid data returned from wishlist endpoint');
            }

            const wishlistGames = response.data;

            setGames(wishlistGames);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching wishlist:', error);
            setLoading(false);
        }
    };

    const handleToggleWishlist = async (game) => {
        if (!game || !game.id) {
            console.error('Game ID is not defined');
            return;
        }

        try {
            if (game.isInWishlist) {
                await axios.delete(`https://localhost:7041/Game_Galaxy/wishlist/remove/${game.id}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    }
                });
            } else {
                await axios.post(`https://localhost:7041/Game_Galaxy/wishlist/add/${game.id}`, {}, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    }
                });
            }

            fetchWishlist();
        } catch (error) {
            console.error('Error toggling wishlist status:', error);
        }
    };

    const handleSort = (sortOption) => {
        const { attribute, order } = sortOption;
        setSortTerm({ attribute, order });
        sortGames({ attribute, order });
    };

    const sortGames = (sortOption) => {
        const { attribute, order } = sortOption;
        const sorted = [...games];

        switch (attribute) {
            case 'releaseDate':
                sorted.sort((a, b) => (order === 'asc' ? new Date(a.releaseDate) - new Date(b.releaseDate) : new Date(b.releaseDate) - new Date(a.releaseDate)));
                break;
            case 'price':
                sorted.sort((a, b) => (order === 'asc' ? a.price - b.price : b.price - a.price));
                break;
            case 'title':
                sorted.sort((a, b) => (order === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)));
                break;
            case 'platform':
                sorted.sort((a, b) => (order === 'asc' ? a.platform.localeCompare(b.platform) : b.platform.localeCompare(a.platform)));
                break;
            case 'condition':
                sorted.sort((a, b) => (order === 'asc' ? a.condition.localeCompare(b.condition) : b.condition.localeCompare(a.condition)));
                break;
            default:
                break;
        }

        setGames(sorted);
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
    };

    const filteredGames = games.filter(game =>
        game.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-screen">
                <img src="/Logo.png" alt="GameGalaxy Logo" className="loading-logo" />
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div>
            <Navbar onSearch={handleSearch} onSort={handleSort} />
            <div className="main-content" style={{ marginTop: '400px' }}>
                <h2>Wishlist</h2>
                <GamesList games={filteredGames} updateWishlistState={handleToggleWishlist} />
            </div>
        </div>
    );
};

export default Wishlist;
