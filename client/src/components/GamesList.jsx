import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './GamesList.css';

const GamesList = ({ games }) => {
    const [notification, setNotification] = useState({ message: '', type: '' });

    const handleToggleWishlist = async (game) => {
        if (!game || !game.id) {
            console.error('Game ID is not defined');
            return;
        }

        try {
            let response;
            if (game.isInWishlist) {
                response = await fetch(`https://localhost:7041/Game_Galaxy/wishlist/remove/${game.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                });
            } else {
                response = await fetch(`https://localhost:7041/Game_Galaxy/wishlist/add/${game.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                });
            }

            if (!response.ok) {
                throw new Error(`Failed to ${game.isInWishlist ? 'remove from' : 'add to'} wishlist`);
            }

            const updatedGames = games.map(g => {
                if (g.id === game.id) {
                    return { ...g, isInWishlist: !game.isInWishlist };
                }
                return g;
            });

            setNotification({
                message: `Game ${game.isInWishlist ? 'removed from' : 'added to'} wishlist!`,
                type: game.isInWishlist ? 'error' : 'success'
            });

            setGames(updatedGames);

        } catch (error) {
            console.error('Error updating wishlist state:', error);
        }
    };

    return (
        <div className="games-list">
            {notification.message && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}
            {games.map((game) => (
                <div key={game.id} className="game-item">
                    <Link to={`/games/${game.id}`} className="game-link">
                        <div className="game-photo-wrapper">
                            <img src={game.gamePictureURL} alt={game.title} className="game-photo" />
                        </div>
                        <div className="game-info">
                            <h3 className="game-title">{game.title}</h3>
                            <p className="game-platform">{game.platform}</p>
                            <p className="game-price">{game.price}$</p>
                        </div>
                    </Link>
                    {}
                    <button
                        className={`star-button ${game.isInWishlist ? 'starred' : 'unstarred'}`}
                        onClick={() => handleToggleWishlist(game)}
                        aria-label={game.isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                        {game.isInWishlist ? '★' : '☆'}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default GamesList;
