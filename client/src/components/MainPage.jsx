import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import GamesList from './GamesList';
import Footer from './Footer';
import Pagination from '@mui/material/Pagination';
import '../App.css';

const MainPage = () => {
    const [games, setGames] = useState([]);
    const [filteredGames, setFilteredGames] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortTerm, setSortTerm] = useState({ attribute: 'releaseDate', order: 'desc' });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (searchTerm) {
            fetchSearchedGames(searchTerm, page);
        } else {
            fetchGames(page);
        }
    }, [searchTerm, sortTerm, page]);

    const fetchGames = async (pageNumber) => {
        setLoading(true);
        try {
            const response = await fetch(`https://localhost:7041/Game_Galaxy/games/all?page=${pageNumber}&perPage=6`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch games');
            }

            const data = await response.json();

            const newGames = data.games.filter(game => !game.isInWishlist);
            setGames(newGames);
            setFilteredGames(sortGames(newGames, sortTerm.attribute, sortTerm.order));

            setTotalPages(Math.ceil(data.totalGames / 6));
        } catch (error) {
            console.error('Error fetching games:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSearchedGames = async (term, pageNumber) => {
        setLoading(true);
        try {
            const response = await fetch(`https://localhost:7041/Game_Galaxy/games/search?searchTerm=${term}&page=${pageNumber}&perPage=6`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch searched games');
            }

            const data = await response.json();

            const newGames = data.games.filter(game => !game.isInWishlist);
            setGames(newGames);
            setFilteredGames(sortGames(newGames, sortTerm.attribute, sortTerm.order));

            setTotalPages(Math.ceil(data.totalGames / 6));
        } catch (error) {
            console.error('Error fetching searched games:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        setPage(1);
        fetchSearchedGames(term, 1);
    };

    const handleSort = ({ attribute, order }) => {
        setSortTerm({ attribute, order });
        setFilteredGames(sortGames([...games], attribute, order));
    };

    const sortGames = (games, attribute, order) => {
        if (!attribute) return games;

        return games.sort((a, b) => {
            switch (attribute) {
                case 'releaseDate':
                    return order === 'asc' ? new Date(a.releaseDate) - new Date(b.releaseDate) : new Date(b.releaseDate) - new Date(a.releaseDate);
                case 'price':
                    return order === 'asc' ? a.price - b.price : b.price - a.price;
                case 'title':
                    return order === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
                case 'platform':
                    return order === 'asc' ? a.platform.localeCompare(b.platform) : b.platform.localeCompare(a.platform);
                case 'condition':
                    return order === 'asc' ? a.condition.localeCompare(b.condition) : b.condition.localeCompare(a.condition);
                default:
                    return 0;
            }
        });
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    return (
        <>
            <Navbar onSearch={handleSearch} onSort={handleSort} />
            <div className="main-content" style={{ marginTop: '400px' }}>
                <div className="games-list-container">
                    <div className="add-game-button-container">
                        <Link to="/add-game" className="custom-button">Add Game</Link>
                    </div>
                    <GamesList games={filteredGames} setGames={setGames} />
                </div>
                {totalPages > 1 && (
                    <div className="pagination-container">
                        <Pagination count={totalPages} page={page} onChange={handlePageChange} />
                    </div>
                )}
                {loading && <div className="loading-screen">
                    <img src="/Logo.png" alt="GameGalaxy Logo" className="loading-logo" />
                    <p>Loading...</p>
                </div>}
            </div>
            <Footer />
        </>
    );
};

export default MainPage;
