import { createAdminClient } from '@/lib/supabase/client';
import { Workout, WorkoutFilters, SubscriptionTier } from '@/types';
import { generateSlug } from '@/lib/utils/helpers';

export class WorkoutService {
  private static get supabase() {
    return createAdminClient();
  }

  static async list(params: {
    page: number;
    limit: number;
    difficulty?: string;
    muscleGroup?: string;
    equipment?: string;
    tier: SubscriptionTier;
    search?: string;
  }) {
    try {
      const { page, limit, difficulty, muscleGroup, equipment, tier, search } = params;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('workouts')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false);

      // Tier-based filtering
      const tierHierarchy = { free: 0, pro: 1, enterprise: 2 };
      const userTierLevel = tierHierarchy[tier];
      const allowedTiers = Object.entries(tierHierarchy)
        .filter(([_, level]) => level <= userTierLevel)
        .map(([t]) => t);

      query = query.in('tier_access', allowedTiers);

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      if (muscleGroup) {
        query = query.contains('muscle_groups', [muscleGroup]);
      }

      if (equipment) {
        query = query.contains('equipment', [equipment]);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data as Workout[],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('List workouts error:', error);
      throw error;
    }
  }

  static async getById(id: string, tier?: SubscriptionTier) {
    try {
      let query = this.supabase
        .from('workouts')
        .select('*')
        .eq('is_deleted', false);

      // Try by ID first
      let { data, error } = await query.eq('id', id).maybeSingle();

      // If not found, try by slug
      if (!data) {
        const slugQuery = this.supabase
          .from('workouts')
          .select('*')
          .eq('is_deleted', false)
          .eq('slug', id)
          .maybeSingle();

        const slugResult = await slugQuery;
        data = slugResult.data;
        error = slugResult.error;
      }

      if (error) throw error;
      if (!data) return null;

      // Check tier access
      if (tier) {
        const tierHierarchy = { free: 0, pro: 1, enterprise: 2 };
        const userTierLevel = tierHierarchy[tier];
        const workoutTierLevel = tierHierarchy[data.tier_access as SubscriptionTier];

        if (workoutTierLevel > userTierLevel) {
          return null; // Not accessible for this tier
        }
      }

      return data as Workout;
    } catch (error) {
      console.error('Get workout by ID error:', error);
      throw error;
    }
  }

  static async create(workoutData: Omit<Workout, 'id' | 'created_at' | 'updated_at' | 'slug'>) {
    try {
      const slug = await this.generateUniqueSlug(workoutData.name);

      const { data, error } = await this.supabase
        .from('workouts')
        .insert({ ...workoutData, slug })
        .select()
        .single();

      if (error) throw error;
      return data as Workout;
    } catch (error) {
      console.error('Create workout error:', error);
      throw error;
    }
  }

  static async update(id: string, workoutData: Partial<Workout>) {
    try {
      // If name is being updated, regenerate slug
      if (workoutData.name) {
        const slug = await this.generateUniqueSlug(workoutData.name, id);
        workoutData.slug = slug;
      }

      const { data, error } = await this.supabase
        .from('workouts')
        .update(workoutData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Workout;
    } catch (error) {
      console.error('Update workout error:', error);
      throw error;
    }
  }

  static async delete(id: string, hard: boolean = false) {
    try {
      if (hard) {
        const { error } = await this.supabase.from('workouts').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await this.supabase
          .from('workouts')
          .update({ is_deleted: true })
          .eq('id', id);
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Delete workout error:', error);
      throw error;
    }
  }

  static async restore(id: string) {
    try {
      const { error } = await this.supabase
        .from('workouts')
        .update({ is_deleted: false })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Restore workout error:', error);
      throw error;
    }
  }

  private static async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    let slug = generateSlug(name);
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      let query = this.supabase
        .from('workouts')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data } = await query.maybeSingle();

      if (!data) {
        isUnique = true;
      } else {
        slug = `${generateSlug(name)}-${counter}`;
        counter++;
      }
    }

    return slug;
  }

  static async getCategories() {
    try {
      const { data, error } = await this.supabase
        .from('workouts')
        .select('muscle_groups, equipment, difficulty')
        .eq('is_deleted', false);

      if (error) throw error;

      const muscleGroups = new Set<string>();
      const equipment = new Set<string>();
      const difficulties = new Set<string>();

      data.forEach((workout: any) => {
        workout.muscle_groups?.forEach((mg: string) => muscleGroups.add(mg));
        workout.equipment?.forEach((eq: string) => equipment.add(eq));
        difficulties.add(workout.difficulty);
      });

      return {
        muscleGroups: Array.from(muscleGroups).sort(),
        equipment: Array.from(equipment).sort(),
        difficulties: Array.from(difficulties),
      };
    } catch (error) {
      console.error('Get categories error:', error);
      throw error;
    }
  }
}