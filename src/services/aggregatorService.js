// src/services/aggregatorService.js
import axios from 'axios';

export class AggregatorService {
    static async verifyIdentity(number, type = 'bvn') {
        try {
            const response = await axios.post(
                `https://api.verified.africa/v1/support/advanced/${type}`,
                { number },
                {
                    headers: {
                        'api-key': process.env.IDENTITYPASS_API_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Identity verification failed: ${error.response?.data?.message || error.message}`);
        }
    }

    static async fetchMonoStatement(accountId) {
        try {
            const response = await axios.get(
                `https://api.withmono.com/v2/accounts/${accountId}/statement`,
                {
                    headers: {
                        'mono-sec-key': process.env.MONO_SECRET_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Mono data fetch failed: ${error.message}`);
        }
    }
}