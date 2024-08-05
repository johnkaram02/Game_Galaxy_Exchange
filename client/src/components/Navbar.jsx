import React, { useState } from 'react';
import { FaSearch, FaUser, FaSignOutAlt, FaBars } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { Select, MenuItem, FormControl, IconButton, Menu } from '@mui/material';
import { clearTokens } from './auth';
import './Navbar.css';

const Navbar = ({ onSearch, onSort }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('release Date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const handleSearch = (e) => {
        e.preventDefault();
        onSearch(searchTerm);
    };

    const handleSortChange = (event) => {
        const sortBy = event.target.value;
        setSortOption(sortBy);
        onSort({ attribute: sortBy, order: sortOrder });
    };

    const handleSortOrderChange = (event) => {
        const order = event.target.value;
        setSortOrder(order);
        onSort({ attribute: sortOption, order });
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleProfileClick = () => {
        navigate('/profile');
        handleMenuClose();
    };

    const handleLogout = () => {
        clearTokens();
        navigate('/login');
        handleMenuClose();
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <img src="/Logo.png" alt="GameGalaxy Logo" className="navbar-logo" onClick={() => navigate('/main')} />
                <div className="title-and-links">
                    <button
                        className={`text-link ${location.pathname === '/main' ? 'active-link' : ''}`}
                        onClick={() => navigate('/main')}
                    >
                        Home
                    </button>
                    <button
                        className={`text-link ${location.pathname === '/wishlist' ? 'active-link' : ''}`}
                        onClick={() => navigate('/wishlist')}
                    >
                        Wishlist
                    </button>
                    <button
                        className={`text-link ${location.pathname === '/seller-inventory' ? 'active-link' : ''}`}
                        onClick={() => navigate('/seller-inventory')}
                    >
                        Inventory
                    </button>
                    <button
                        className={`text-link ${location.pathname === '/seller-dashboard' ? 'active-link' : ''}`}
                        onClick={() => navigate('/seller-dashboard')}
                    >
                        Dashboard
                    </button>
                </div>
                <div className="search-and-sort">
                    <form className="search-form" onSubmit={handleSearch}>
                        <input
                            type="text"
                            name="search"
                            placeholder="Search games..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoComplete="off"
                        />
                        <button type="submit" className="search-button"><FaSearch /></button>
                    </form>
                    <FormControl className="sort-dropdown">
                        <Select
                            id="sort-select"
                            value={sortOption}
                            onChange={handleSortChange}
                            className="sort-select"
                            MenuProps={{ PaperProps: { style: { backgroundColor: '#1abc9c' } } }}
                            displayEmpty
                            renderValue={(selected) => (
                                <span style={{ color: '#ffffff' }}>{selected ? selected.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Release Date'}</span>
                            )}
                        >
                            <MenuItem value="release Date" style={{ color: '#ffffff' }}>release Date</MenuItem>
                            <MenuItem value="price" style={{ color: '#ffffff' }}>price</MenuItem>
                            <MenuItem value="title" style={{ color: '#ffffff' }}>title</MenuItem>
                            <MenuItem value="platform" style={{ color: '#ffffff' }}>platform</MenuItem>
                            <MenuItem value="condition" style={{ color: '#ffffff' }}>condition</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl className="sort-order-dropdown">
                        <Select
                            id="sort-order-select"
                            value={sortOrder}
                            onChange={handleSortOrderChange}
                            className="sort-order-select"
                            MenuProps={{ PaperProps: { style: { backgroundColor: '#1abc9c' } } }}
                            displayEmpty
                            renderValue={(selected) => (
                                <span style={{ color: '#ffffff' }}>{selected === 'asc' ? 'Ascending' : 'Descending'}</span>
                            )}
                        >
                            <MenuItem value="asc" style={{ color: '#ffffff' }}>Ascending</MenuItem>
                            <MenuItem value="desc" style={{ color: '#ffffff' }}>Descending</MenuItem>
                        </Select>
                    </FormControl>
                </div>
                <div className="menu-section">
                    <IconButton className="menu-icon" onClick={handleMenuOpen}><FaBars /></IconButton>
                    <Menu
                        id="profile-menu"
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                        PaperProps={{ style: { backgroundColor: '#1abc9c' } }}
                    >
                        <MenuItem onClick={handleProfileClick} className="menu-item">
                            Profile
                        </MenuItem>
                        <MenuItem onClick={handleLogout} className="menu-item">
                            Logout
                        </MenuItem>
                    </Menu>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
