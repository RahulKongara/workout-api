'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Workout } from '@/types';
import { formatDate } from '@/lib/utils/helpers';

export default function AdminWorkoutsPage() {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filteredWorkouts, setFilteredWorkouts] = useState<Workout[]>([]);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchWorkouts();
    }, []);

    useEffect(() => {
        if (search) {
            const filtered = workouts.filter(
                (w) =>
                    w.name.toLowerCase().includes(search.toLowerCase()) ||
                    w.description.toLowerCase().includes(search.toLowerCase())
            );
            setFilteredWorkouts(filtered);
        } else {
            setFilteredWorkouts(workouts);
        }
    }, [search, workouts]);

    const fetchWorkouts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching workouts:', error);
        } else {
            setWorkouts(data || []);
            setFilteredWorkouts(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        const { error } = await supabase
            .from('workouts')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) {
            alert('Failed to delete workout');
            console.error(error);
        } else {
            fetchWorkouts();
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner':
                return 'bg-green-100 text-green-800';
            case 'intermediate':
                return 'bg-yellow-100 text-yellow-800';
            case 'advanced':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'free':
                return 'bg-blue-100 text-blue-800';
            case 'pro':
                return 'bg-purple-100 text-purple-800';
            case 'enterprise':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading workouts...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Workouts</h1>
                    <p className="text-gray-500 mt-1">
                        Manage your workout database ({workouts.length} total)
                    </p>
                </div>
                <Link href="/admin/workouts/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Workout
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                    type="text"
                    placeholder="Search workouts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Muscle Groups</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredWorkouts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    {search ? 'No workouts found matching your search' : 'No workouts yet'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredWorkouts.map((workout) => (
                                <TableRow key={workout.id}>
                                    <TableCell className="font-medium">{workout.name}</TableCell>
                                    <TableCell>
                                        <Badge className={getDifficultyColor(workout.difficulty)}>
                                            {workout.difficulty}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{workout.duration} min</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {workout.muscle_groups.slice(0, 2).map((mg) => (
                                                <Badge key={mg} variant="outline" className="text-xs">
                                                    {mg}
                                                </Badge>
                                            ))}
                                            {workout.muscle_groups.length > 2 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{workout.muscle_groups.length - 2}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getTierColor(workout.tier_access)}>
                                            {workout.tier_access}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {formatDate(workout.created_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/workouts/${workout.id}/edit`}>
                                                <Button variant="ghost" size="sm">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(workout.id, workout.name)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}