import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import Navbar from './Navbar';
import './SellerDashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const SellerDashboard = () => {
    const [totalSales, setTotalSales] = useState(0);
    const [monthlySales, setMonthlySales] = useState(0);
    const [inventory, setInventory] = useState([]);
    const [bestSellingPlatforms, setBestSellingPlatforms] = useState([]);
    const [salesTrend, setSalesTrend] = useState([]);
    const [averageRating, setAverageRating] = useState(0);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');

            const salesResponse = await axios.get('https://localhost:7041/Game_Galaxy/sales/total', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTotalSales(salesResponse.data.totalSales);

            const monthlySalesResponse = await axios.get('https://localhost:7041/Game_Galaxy/sales/monthly', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMonthlySales(monthlySalesResponse.data.monthlySales);

            const inventoryResponse = await axios.get('https://localhost:7041/Game_Galaxy/inventory/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setInventory(inventoryResponse.data);

            const platformsResponse = await axios.get('https://localhost:7041/Game_Galaxy/sales/platforms', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setBestSellingPlatforms(platformsResponse.data);

            const trendResponse = await axios.get('https://localhost:7041/Game_Galaxy/sales/trend', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSalesTrend(trendResponse.data);

            const ratingResponse = await axios.get('https://localhost:7041/Game_Galaxy/reviews/average', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAverageRating(ratingResponse.data.averageRating);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const inventoryStatus = inventory.map(item => item.quantity_available);
    const inventoryTitles = inventory.map(item => item.title);

    const platformLabels = bestSellingPlatforms.map(platform => platform.name);
    const platformSales = bestSellingPlatforms.map(platform => platform.sales);

    const salesTrendLabels = salesTrend.map(sale => sale.month);
    const salesTrendData = salesTrend.map(sale => sale.totalSales);

    return (
        <>
            <Navbar />
            <div className="seller-dashboard" style={{ marginTop: '400px' }}>
                <h1>Seller Dashboard</h1>
                <div className="dashboard-grid">
                    <div className="dashboard-item">
                        <h3>Total Sales</h3>
                        <p>${totalSales}</p>
                    </div>
                    <div className="dashboard-item">
                        <h3>Monthly Sales</h3>
                        <p>${monthlySales}</p>
                    </div>
                    <div className="dashboard-item">
                        <h3>Inventory Status</h3>
                        <Pie
                            data={{
                                labels: inventoryTitles,
                                datasets: [{
                                    data: inventoryStatus,
                                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                                }]
                            }}
                        />
                    </div>
                    <div className="dashboard-item">
                        <h3>Best-Selling Platforms</h3>
                        <Pie
                            data={{
                                labels: platformLabels,
                                datasets: [{
                                    data: platformSales,
                                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                                }]
                            }}
                        />
                    </div>
                    <div className="dashboard-item">
                        <h3>Sales Trend</h3>
                        <Bar
                            data={{
                                labels: salesTrendLabels,
                                datasets: [{
                                    label: 'Sales Trend',
                                    data: salesTrendData,
                                    backgroundColor: '#36A2EB'
                                }]
                            }}
                        />
                    </div>
                    <div className="dashboard-item">
                        <h3>Average Rating</h3>
                        <p>{averageRating} / 5</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SellerDashboard;
