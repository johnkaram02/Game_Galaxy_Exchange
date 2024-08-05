import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import StarRatings from 'react-star-ratings';
import './GameDetails.css';
import Navbar from './Navbar';

const GameDetails = ({ wishlistProp = [], setWishlistProp }) => {
    const { gameId } = useParams();
    const [game, setGame] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
    const [showModal, setShowModal] = useState(false);
    const [publisherInfo, setPublisherInfo] = useState({});
    const [wishlistSuccess, setWishlistSuccess] = useState(false);
    const [wishlistMessage, setWishlistMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        if (!gameId) {
            console.error('Game ID is not defined');
            return;
        }
        fetchGameDetails(gameId);
        fetchReviews(gameId);
    }, [gameId]);

    const fetchGameDetails = (gameId) => {
        axios.get(`https://localhost:7041/Game_Galaxy/games/${gameId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(response => {
                if (!response.data) {
                    throw new Error('Failed to fetch game details');
                }
                setGame(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching game details:', error);
                setError('Failed to fetch game details');
                setLoading(false);
            });
    };

    const fetchReviews = (gameId) => {
        axios.get(`https://localhost:7041/Game_Galaxy/games/${gameId}/reviews`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(response => {
                setReviews(response.data);
            })
            .catch(error => {
                console.error('Error fetching reviews:', error);
                if (error.response && error.response.status === 404) {
                    setReviews([]);
                }
            });
    };

    const handleAddToWishlist = () => {
        if (!game || !game.id) {
            console.error('Game ID is not defined');
            return;
        }
        axios.post(`https://localhost:7041/Game_Galaxy/wishlist/add/${game.id}`, null, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(response => {
                setWishlistSuccess(true);
                setWishlistMessage('Game successfully added to wishlist!');
                setMessageType('success');
                setWishlistProp([...wishlistProp, game.id]);
            })
            .catch(error => {
                console.error('Error adding to wishlist:', error);
                if (error.response) {
                    setError(`Failed to add game to wishlist: ${error.response.data.title}`);
                } else {
                    setError('Failed to add game to wishlist: Network error');
                }
            });
    };

    const handleRemoveFromWishlist = () => {
        if (!game || !game.id) {
            console.error('Game ID is not defined');
            return;
        }
        axios.delete(`https://localhost:7041/Game_Galaxy/wishlist/remove/${game.id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            }
        })
            .then(response => {
                setWishlistSuccess(true);
                setWishlistMessage('Game successfully removed from wishlist!');
                setMessageType('error');
                setWishlistProp(wishlistProp.filter(id => id !== game.id));
            })
            .catch(error => {
                console.error('Error removing from wishlist:', error);
                if (error.response) {
                    setError(`Failed to remove game from wishlist: ${error.response.data.title}`);
                } else {
                    setError('Failed to remove game from wishlist: Network error');
                }
            });
    };

    const handleBuyGame = () => {
        if (!game || !game.publisher || !game.address || !game.number) {
            console.error('Publisher information is not available');
            return;
        }
        setPublisherInfo({ name: game.publisher, address: game.address, phone: game.number });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const handleReviewSubmit = (event) => {
        event.preventDefault();
        if (!game || !game.id || !newReview.rating || !newReview.comment) {
            console.error('Game ID or review data is missing');
            return;
        }
        axios.post(`https://localhost:7041/Game_Galaxy/games/${game.id}/reviews`, newReview, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(response => {
                setNewReview({ rating: 0, comment: '' });
                fetchReviews(game.id);
            })
            .catch(error => {
                console.error('Error adding review:', error);
            });
    };

    const handleRatingChange = (newRating) => {
        setNewReview({ ...newReview, rating: newRating });
    };

    const handleCommentChange = (event) => {
        setNewReview({ ...newReview, comment: event.target.value });
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

    if (!game) {
        return <div>Game not found</div>;
    }

    const imageURL = `${game.gamePictureURL.replace('./public/', '/')}`;

    return (
        <>
            <Navbar />
            <div className="game-details">
                <div>
                    {wishlistSuccess && (
                        <div className={`message-box ${messageType}`}>
                            <p>{wishlistMessage}</p>
                        </div>
                    )}
                    <div className="game-photo-container">
                        <img src={imageURL} alt={game.title} className="game-photo" />
                    </div>
                    <div className="game-inf">
                        <p><strong>Publisher:</strong> {game.publisher}</p>
                        <p><strong>Description:</strong> {game.description}</p>
                        <p><strong>Price:</strong> ${game.price}</p>
                        <p><strong>Date Released:</strong> {new Date(game.releaseDate).toLocaleDateString()}</p>
                        <p><strong>Platform:</strong> {game.platform}</p>
                    </div>
                    <div className="actions">
                        <button className="buy-button" onClick={handleBuyGame}>Buy Game</button>
                        {game.isInWishlist && (
                            <button className="wishlist-button" onClick={handleRemoveFromWishlist}>Remove from Wishlist</button>
                        )}
                        {!game.isInWishlist && (
                            <button className="wishlist-button" onClick={handleAddToWishlist}>Add to Wishlist</button>
                        )}
                    </div>
                </div>
                <div className="reviews-section">
                    <h2>Reviews</h2>
                    <form onSubmit={handleReviewSubmit}>
                        <label>
                            Rating:
                            <StarRatings
                                rating={newReview.rating}
                                starRatedColor="gold"
                                changeRating={handleRatingChange}
                                numberOfStars={5}
                                name='rating'
                                starDimension="24px"
                                starSpacing="2px"
                            />
                        </label>
                        <br />
                        <label>
                            Comment:
                            <textarea value={newReview.comment} onChange={handleCommentChange} />
                        </label>
                        <br />
                        <button type="submit">Submit Review</button>
                    </form>
                    <div className="reviews-list">
                        {reviews.length > 0 ? (
                            reviews.map(review => (
                                <div key={review.id} className="review-item">
                                    <div><strong>User:</strong> {review.userName}</div>
                                    <div>
                                        <strong>Rating:</strong>
                                        <StarRatings
                                            rating={review.rating}
                                            starRatedColor="gold"
                                            numberOfStars={5}
                                            name='rating'
                                            starDimension="24px"
                                            starSpacing="2px"
                                        />
                                    </div>
                                    <div><strong>Comment:</strong> {review.comment}</div>
                                    <div><strong>Date Posted:</strong> {new Date(review.datePosted).toLocaleDateString()}</div>
                                    <hr />
                                </div>
                            ))
                        ) : (
                            <p>No reviews yet.</p>
                        )}
                    </div>
                </div>
                {showModal && (
                    <div className="modal">
                        <div className="modal-content">
                            <span className="close-button" onClick={closeModal}>&times;</span>
                            <h2>{publisherInfo.name}</h2>
                            <p><strong>Address:</strong> {publisherInfo.address}</p>
                            <p><strong>Phone:</strong> {publisherInfo.phone}</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default GameDetails;
