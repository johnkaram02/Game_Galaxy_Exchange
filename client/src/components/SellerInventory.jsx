import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import Pagination from '@mui/material/Pagination';
import './GamesList.css';
import '../App.css';

const SellerInventory = () => {
    const [gamesList, setGamesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchSellerInventory(page);
    }, [page]);

    const fetchSellerInventory = async (pageNumber) => {
        setLoading(true);
        try {
            const response = await axios.get(`https://localhost:7041/Game_Galaxy/sellerInventory?page=${pageNumber}&perPage=6`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setGamesList(response.data.games);
            setTotalPages(Math.ceil(response.data.totalGames / 6));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching seller inventory:', error);
            setError('Failed to fetch seller inventory');
            setLoading(false);
        }
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    if (loading) {
        return <div className="loading-screen">
            <img src="/Logo.png" alt="GameGalaxy Logo" className="loading-logo" />
            <p>Loading...</p>
        </div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <>
            <Navbar />
            <div className="main-content" style={{ marginTop: '350px' }}>
                <div className="games-list">
                    {gamesList.map(game => (
                        <div key={game.id} className="game-item">
                            <Link to={`/modify-game/${game.id}`} className="game-link">
                                <div className="game-photo-wrapper">
                                    <img
                                        src={game.game_picture_url}
                                        alt={game.title}
                                        className="game-photo"
                                    />
                                </div>
                                <div className="game-info">
                                    <h3 className="game-title">{game.title}</h3>
                                    <p className="game-platform">{game.platform}</p>
                                    <p className="game-price">${game.price}</p>
                                </div>
                                <button className="modify-button">Modify Game</button>
                            </Link>
                        </div>
                    ))}
                </div>
                {totalPages > 1 && (
                    <div className="pagination-container">
                        <Pagination count={totalPages} page={page} onChange={handlePageChange} />
                    </div>
                )}
            </div>
        </>
    );
};

export default SellerInventory;
