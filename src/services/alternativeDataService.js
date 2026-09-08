// src/services/alternativeDataService.js
import axios from 'axios';

const AGGREGATOR_BASE_URL = process.env.AGGREGATOR_BASE_URL || 'https://api.withmono.com/v2';

export class AlternativeDataService {
    static async exchangeToken(code) {
        try {
            const response = await axios.post(`${AGGREGATOR_BASE_URL}/accounts/auth`, {
                code
            }, {
                headers: {
                    'mono-sec-key': process.env.AGGREGATOR_SECRET_KEY,
                    'Content-Type': 'application/json'
                }
            });
            return response.data; // Returns account ID data
        } catch (error) {
            console.error('Error exchanging token with alternative data provider:', error.response?.data || error.message);
            throw new Error('Failed to authorize bank account connection.');
        }
    }

    static async fetchAccountTransactions(accountId) {
        try {
            const response = await axios.get(`${AGGREGATOR_BASE_URL}/accounts/${accountId}/transactions`, {
                headers: {
                    'mono-sec-key': process.env.AGGREGATOR_SECRET_KEY
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching transactions:', error.response?.data || error.message);
            throw new Error('Failed to retrieve transaction history.');
        }
    }
}