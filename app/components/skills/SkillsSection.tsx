'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Search, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useToast } from '@/app/components/ui/use-toast';

interface Skill {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  has_level: boolean;
}

interface UserSkill {
  skill_id: string;
  proficiency_level: string;
}

export default function SkillsSection({ userId }: { userId: string }) {
  const [currentTab, setCurrentTab] = useState('technical');
  const [searchQuery, setSearchQuery] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  // Fetch skills and user skills
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all skills
        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('*')
          .order('name');

        if (skillsError) throw skillsError;

        // Fetch user's skills
        const { data: userSkillsData, error: userSkillsError } = await supabase
          .from('user_skills')
          .select('skill_id, proficiency_level')
          .eq('user_id', userId);

        if (userSkillsError) throw userSkillsError;

        setSkills(skillsData || []);
        setUserSkills(userSkillsData || []);
      } catch (error) {
        console.error('Error fetching skills:', error);
        toast({
          title: 'Error',
          description: 'Failed to load skills. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, supabase, toast]);

  // Group skills by category and subcategory
  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = {};
    }
    if (!acc[skill.category][skill.subcategory]) {
      acc[skill.category][skill.subcategory] = [];
    }
    acc[skill.category][skill.subcategory].push(skill);
    return acc;
  }, {} as Record<string, Record<string, Skill[]>>);

  // Filter skills based on search query
  const filteredSkills = searchQuery
    ? skills.filter(
        (skill) =>
          skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          skill.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          skill.subcategory.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Handle skill selection and proficiency update
  const handleSkillUpdate = async (skillId: string, proficiencyLevel?: string) => {
    try {
      const existingSkill = userSkills.find((s) => s.skill_id === skillId);

      if (existingSkill && !proficiencyLevel) {
        // Remove skill
        const { error } = await supabase
          .from('user_skills')
          .delete()
          .eq('user_id', userId)
          .eq('skill_id', skillId);

        if (error) throw error;

        setUserSkills(userSkills.filter((s) => s.skill_id !== skillId));
      } else if (!existingSkill && proficiencyLevel) {
        // Add skill
        const { error } = await supabase.from('user_skills').insert({
          user_id: userId,
          skill_id: skillId,
          proficiency_level: proficiencyLevel,
        });

        if (error) throw error;

        setUserSkills([...userSkills, { skill_id: skillId, proficiency_level: proficiencyLevel }]);
      } else if (existingSkill && proficiencyLevel) {
        // Update proficiency
        const { error } = await supabase
          .from('user_skills')
          .update({ proficiency_level: proficiencyLevel })
          .eq('user_id', userId)
          .eq('skill_id', skillId);

        if (error) throw error;

        setUserSkills(
          userSkills.map((s) =>
            s.skill_id === skillId ? { ...s, proficiency_level: proficiencyLevel } : s
          )
        );
      }

      toast({
        title: 'Success',
        description: 'Skills updated successfully.',
      });
    } catch (error) {
      console.error('Error updating skill:', error);
      toast({
        title: 'Error',
        description: 'Failed to update skill. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading skills...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {searchQuery ? (
        <Card className="p-4">
          <h3 className="mb-4 font-medium">Search Results</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSkills.map((skill) => (
              <SkillItem
                key={skill.id}
                skill={skill}
                userSkill={userSkills.find((s) => s.skill_id === skill.id)}
                onUpdate={handleSkillUpdate}
              />
            ))}
          </div>
        </Card>
      ) : (
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-4">
            {Object.keys(groupedSkills).map((category) => (
              <TabsTrigger key={category} value={category.toLowerCase()}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(groupedSkills).map(([category, subcategories]) => (
            <TabsContent key={category} value={category.toLowerCase()}>
              <div className="space-y-6">
                {Object.entries(subcategories).map(([subcategory, skillsList]) => (
                  <Card key={subcategory} className="p-4">
                    <h3 className="mb-4 font-medium">{subcategory}</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {skillsList.map((skill) => (
                        <SkillItem
                          key={skill.id}
                          skill={skill}
                          userSkill={userSkills.find((s) => s.skill_id === skill.id)}
                          onUpdate={handleSkillUpdate}
                        />
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function SkillItem({
  skill,
  userSkill,
  onUpdate,
}: {
  skill: Skill;
  userSkill?: UserSkill;
  onUpdate: (skillId: string, proficiencyLevel?: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex-1">
        <div className="font-medium">{skill.name}</div>
        <div className="text-sm text-muted-foreground">{skill.subcategory}</div>
      </div>
      <div className="ml-4">
        {userSkill ? (
          <div className="flex items-center gap-2">
            {skill.has_level ? (
              <Select
                value={userSkill.proficiency_level}
                onValueChange={(value) => onUpdate(skill.id, value)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge>Added</Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUpdate(skill.id)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => onUpdate(skill.id, 'Beginner')}>
            Add
          </Button>
        )}
      </div>
    </div>
  );
} 