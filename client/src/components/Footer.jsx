import React from 'react';
import { Typography, Link } from '@mui/material';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <Typography variant="body2" color="textSecondary" align="center">
                    &copy; {new Date().getFullYear()} GameGalaxy. All rights reserved.
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center">
                    <Link href="/privacy-policy" className="footer-link">
                        Privacy Policy
                    </Link>
                    {' | '}
                    <Link href="/terms-of-service" className="footer-link">
                        Terms of Service
                    </Link>
                </Typography>
            </div>
        </footer>
    );
};

export default Footer;
