// src/scripts/seed.js
import dotenv from 'dotenv';
import supabase from '../utils/supabaseClient.js';

dotenv.config();

async function seedDatabase() {
    console.log('Starting database seeding...');

    try {
        // 1. Insert Mock Users
        const { data: users, error: userError } = await supabase
            .from('users')
            .upsert([
                { id: '11111111-1111-1111-1111-111111111111', email: 'risk.officer@africredit.com', role: 'risk_officer' },
                { id: '22222222-2222-2222-2222-222222222222', email: 'borrower.john@example.com', role: 'borrower' },
                { id: '33333333-3333-3333-3333-333333333333', email: 'admin@africredit.com', role: 'admin' }
            ], { onConflict: 'id' })
            .select();

        if (userError) throw userError;
        console.log('Users seeded successfully.');

        // 2. Insert Mock KYC Profile for Borrower John
        const { error: kycError } = await supabase
            .from('kyc_profiles')
            .upsert([
                {
                    user_id: '22222222-2222-2222-2222-222222222222',
                    full_name: 'John Doe',
                    date_of_birth: '1995-06-15',
                    bvn: '22334455667',
                    nin: '11223344556',
                    id_type: 'NATIONAL_ID',
                    id_number: 'NIN987654321',
                    status: 'verified',
                    updated_at: new Date()
                }
            ], { onConflict: 'user_id' });

        if (kycError) throw kycError;
        console.log('KYC profiles seeded successfully.');

        // 3. Insert Mock Linked Bank Account for Alternative Data Scoring
        const { error: bankError } = await supabase
            .from('linked_bank_accounts')
            .upsert([
                {
                    user_id: '22222222-2222-2222-2222-222222222222',
                    account_id: 'mono_acc_test_12345',
                    provider: 'mono',
                    status: 'linked',
                    updated_at: new Date()
                }
            ], { onConflict: 'account_id' });

        if (bankError) throw bankError;
        console.log('Linked bank accounts seeded successfully.');

        // 4. Insert Mock Credit Score
        const { error: creditError } = await supabase
            .from('credit_scores')
            .upsert([
                {
                    user_id: '22222222-2222-2222-2222-222222222222',
                    score: 720,
                    eligible: true,
                    max_limit: 150000,
                    evaluated_at: new Date()
                }
            ], { onConflict: 'user_id' });

        if (creditError) throw creditError;
        console.log('Credit scores seeded successfully.');

        console.log('Database seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err.message);
        process.exit(1);
    }
}

seedDatabase();