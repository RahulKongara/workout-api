import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET() {
    try {
        const supabase = createAdminClient();

        // Check database connectivity
        const { error } = await supabase.from('workouts').select('id').limit(1);

        if (error) {
            return NextResponse.json(
                {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    checks: {
                        database: 'fail',
                    },
                },
                { status: 503 }
            );
        }

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: 'v1',
            checks: {
                database: 'pass',
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Health check failed',
            },
            { status: 503 }
        );
    }
}

export const dynamic = 'force-dynamic';