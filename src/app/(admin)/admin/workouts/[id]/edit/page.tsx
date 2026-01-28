'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageUpload } from '@/components/ui/image-upload';
import { ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { Workout } from '@/types';

export default function EditWorkoutPage() {
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [instructions, setInstructions] = useState<string[]>(['']);
    const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const params = useParams();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
        register,
        setValue,
        getValues,
        formState: { errors },
    } = useForm({
        defaultValues: {
            name: '',
            description: '',
            difficulty: undefined as any,
            duration: undefined as any,
            tier_access: 'free',
            video_url: '',
            calories_burned: undefined as any,
        },
    });

    useEffect(() => {
        fetchWorkout();
    }, [params.id]);

    const fetchWorkout = async () => {
        try {
            const { data, error } = await supabase
                .from('workouts')
                .select('*')
                .eq('id', params.id)
                .single();

            if (error) throw error;

            setWorkout(data);

            // Populate form
            setValue('name', data.name);
            setValue('description', data.description);
            setValue('difficulty', data.difficulty);
            setValue('duration', data.duration);
            setValue('video_url', data.video_url || '');
            setValue('calories_burned', data.calories_burned);
            setValue('tier_access', data.tier_access);

            setImageUrl(data.image_url || null);
            setSelectedMuscleGroups(data.muscle_groups);
            setSelectedEquipment(data.equipment || []);
            setInstructions(data.instructions.length > 0 ? data.instructions : ['']);
        } catch (err) {
            console.error('Error fetching workout:', err);
            setError('Failed to load workout');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async () => {
        const data = getValues();

        // Validate required fields
        if (!data.name || data.name.trim() === '') {
            setError('Please enter a workout name');
            return;
        }

        if (!data.description || data.description.trim() === '') {
            setError('Please enter a description');
            return;
        }

        if (!data.difficulty) {
            setError('Please select a difficulty level');
            return;
        }

        if (!data.duration || data.duration < 1) {
            setError('Please enter a valid duration (at least 1 minute)');
            return;
        }

        // Validate arrays
        if (selectedMuscleGroups.length === 0) {
            setError('Please select at least one muscle group');
            return;
        }

        const filteredInstructions = instructions.filter((i) => i.trim() !== '');
        if (filteredInstructions.length === 0) {
            setError('Please add at least one instruction');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const workoutData = {
                name: data.name,
                description: data.description,
                difficulty: data.difficulty,
                duration: data.duration,
                muscle_groups: selectedMuscleGroups,
                equipment: selectedEquipment,
                instructions: filteredInstructions,
                tier_access: data.tier_access || 'free',
                video_url: data.video_url || null,
                image_url: imageUrl,
                calories_burned: data.calories_burned || null,
            };

            const { error: updateError } = await supabase
                .from('workouts')
                .update(workoutData)
                .eq('id', params.id);

            if (updateError) throw updateError;

            router.push('/admin/workouts');
        } catch (err: any) {
            setError(err.message || 'Failed to update workout');
        } finally {
            setSaving(false);
        }
    };

    const addInstruction = () => {
        setInstructions([...instructions, '']);
    };

    const updateInstruction = (index: number, value: string) => {
        const updated = [...instructions];
        updated[index] = value;
        setInstructions(updated);
    };

    const removeInstruction = (index: number) => {
        setInstructions(instructions.filter((_, i) => i !== index));
    };

    const toggleMuscleGroup = (group: string) => {
        setSelectedMuscleGroups((prev) =>
            prev.includes(group)
                ? prev.filter((g) => g !== group)
                : [...prev, group]
        );
    };

    const toggleEquipment = (equipment: string) => {
        setSelectedEquipment((prev) =>
            prev.includes(equipment)
                ? prev.filter((e) => e !== equipment)
                : [...prev, equipment]
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading workout...</div>
            </div>
        );
    }

    if (!workout) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Workout not found</p>
                <Link href="/admin/workouts">
                    <Button>Back to Workouts</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            <div className="mb-6">
                <Link href="/admin/workouts">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Workouts
                    </Button>
                </Link>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    Edit Workout: {workout.name}
                </h1>

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }} className="space-y-6">
                    {/* Name */}
                    <div>
                        <Label htmlFor="name">Workout Name *</Label>
                        <Input
                            id="name"
                            {...register('name')}
                            placeholder="e.g., Push-Up Workout"
                            className="mt-1"
                        />
                        {errors.name && (
                            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            {...register('description')}
                            placeholder="Describe the workout..."
                            rows={4}
                            className="mt-1"
                        />
                        {errors.description && (
                            <p className="text-red-500 text-sm mt-1">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    {/* Difficulty & Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="difficulty">Difficulty *</Label>
                            <Select
                                onValueChange={(value) => setValue('difficulty', value as any)}
                                defaultValue={workout.difficulty}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="beginner">Beginner</SelectItem>
                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                    <SelectItem value="advanced">Advanced</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.difficulty && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.difficulty?.message as string}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="duration">Duration (minutes) *</Label>
                            <Input
                                id="duration"
                                type="number"
                                {...register('duration', { valueAsNumber: true })}
                                placeholder="30"
                                className="mt-1"
                            />
                            {errors.duration && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.duration?.message as string}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Muscle Groups */}
                    <div>
                        <Label>Muscle Groups *</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {MUSCLE_GROUPS.map((group) => (
                                <button
                                    key={group}
                                    type="button"
                                    onClick={() => toggleMuscleGroup(group)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedMuscleGroups.includes(group)
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>
                        {selectedMuscleGroups.length === 0 && (
                            <p className="text-red-500 text-sm mt-1">
                                Select at least one muscle group
                            </p>
                        )}
                    </div>

                    {/* Equipment */}
                    <div>
                        <Label>Equipment</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {EQUIPMENT_OPTIONS.map((equipment) => (
                                <button
                                    key={equipment}
                                    type="button"
                                    onClick={() => toggleEquipment(equipment)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedEquipment.includes(equipment)
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {equipment}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div>
                        <Label>Instructions *</Label>
                        <div className="space-y-2 mt-2">
                            {instructions.map((instruction, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        value={instruction}
                                        onChange={(e) => updateInstruction(index, e.target.value)}
                                        placeholder={`Step ${index + 1}`}
                                    />
                                    {instructions.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeInstruction(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addInstruction}
                            className="mt-2"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Step
                        </Button>
                    </div>

                    {/* Optional fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="video_url">Video URL</Label>
                            <Input
                                id="video_url"
                                {...register('video_url')}
                                placeholder="https://youtube.com/..."
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="calories_burned">Calories Burned</Label>
                            <Input
                                id="calories_burned"
                                type="number"
                                {...register('calories_burned', { valueAsNumber: true })}
                                placeholder="300"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Workout Image</Label>
                        <div className="mt-2">
                            <ImageUpload
                                value={imageUrl || undefined}
                                onChange={(url) => setImageUrl(url)}
                                disabled={saving}
                                folder="workouts"
                            />
                        </div>
                    </div>

                    {/* Tier Access */}
                    <div>
                        <Label htmlFor="tier_access">Minimum Tier Required *</Label>
                        <Select
                            onValueChange={(value) => setValue('tier_access', value as any)}
                            defaultValue={workout.tier_access}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-4 pt-4">
                        <Button type="submit" disabled={saving} className="flex-1">
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Link href="/admin/workouts">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}