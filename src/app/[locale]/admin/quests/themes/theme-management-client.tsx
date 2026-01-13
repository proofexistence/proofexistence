'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useWeb3Auth } from '@/lib/web3auth';

interface DefaultTheme {
  id: number;
  theme: string;
  description: string | null;
  isActive: boolean;
}

interface DailyTheme {
  id: string;
  date: string;
  theme: string;
  description: string | null;
}

interface Props {
  defaultThemes: DefaultTheme[];
  overrides: DailyTheme[];
}

export function ThemeManagementClient({ defaultThemes, overrides }: Props) {
  const { user } = useWeb3Auth();
  const queryClient = useQueryClient();
  const [editingTheme, setEditingTheme] = useState<DefaultTheme | null>(null);
  const [newTheme, setNewTheme] = useState({ theme: '', description: '' });
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideTheme, setOverrideTheme] = useState({
    theme: '',
    description: '',
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user?.walletAddress) {
    headers['X-Wallet-Address'] = user.walletAddress;
  }

  // Add default theme mutation
  const addThemeMutation = useMutation({
    mutationFn: async (data: { theme: string; description: string }) => {
      const res = await fetch('/api/admin/quests/themes', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add theme');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'themes'] });
      setNewTheme({ theme: '', description: '' });
      setIsAddDialogOpen(false);
      window.location.reload();
    },
  });

  // Update theme mutation
  const updateThemeMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      theme: string;
      description: string;
      isActive: boolean;
    }) => {
      const res = await fetch(`/api/admin/quests/themes/${data.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update theme');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'themes'] });
      setEditingTheme(null);
      window.location.reload();
    },
  });

  // Add override mutation
  const addOverrideMutation = useMutation({
    mutationFn: async (data: {
      date: string;
      theme: string;
      description: string;
    }) => {
      const res = await fetch('/api/admin/quests/themes/override', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add override');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'themes'] });
      setOverrideDate('');
      setOverrideTheme({ theme: '', description: '' });
      window.location.reload();
    },
  });

  // Delete override mutation
  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/quests/themes/override/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete override');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'themes'] });
      window.location.reload();
    },
  });

  return (
    <div className="container mx-auto pt-24 pb-8 px-4 space-y-8">
      <h1 className="text-2xl font-bold text-white">Theme Management</h1>

      {/* Default Themes Section */}
      <section className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Default Theme Pool
          </h2>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Add Theme
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Theme</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Theme name"
                  value={newTheme.theme}
                  onChange={(e) =>
                    setNewTheme({ ...newTheme, theme: e.target.value })
                  }
                  className="bg-white/5 border-white/10 text-white"
                />
                <Input
                  placeholder="Description"
                  value={newTheme.description}
                  onChange={(e) =>
                    setNewTheme({ ...newTheme, description: e.target.value })
                  }
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button
                  onClick={() => addThemeMutation.mutate(newTheme)}
                  disabled={!newTheme.theme || addThemeMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                  ID
                </th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                  Theme
                </th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                  Description
                </th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                  Active
                </th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {defaultThemes.map((theme) => (
                <tr key={theme.id} className="border-b border-white/5">
                  <td className="py-2 px-4 text-zinc-300">{theme.id}</td>
                  <td className="py-2 px-4 text-white font-medium">
                    {editingTheme?.id === theme.id ? (
                      <Input
                        value={editingTheme.theme}
                        onChange={(e) =>
                          setEditingTheme({
                            ...editingTheme,
                            theme: e.target.value,
                          })
                        }
                        className="bg-white/5 border-white/10 text-white h-8"
                      />
                    ) : (
                      theme.theme
                    )}
                  </td>
                  <td className="py-2 px-4 text-zinc-400">
                    {editingTheme?.id === theme.id ? (
                      <Input
                        value={editingTheme.description || ''}
                        onChange={(e) =>
                          setEditingTheme({
                            ...editingTheme,
                            description: e.target.value,
                          })
                        }
                        className="bg-white/5 border-white/10 text-white h-8"
                      />
                    ) : (
                      theme.description
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className={
                        theme.isActive ? 'text-green-400' : 'text-red-400'
                      }
                    >
                      {theme.isActive ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    {editingTheme?.id === theme.id ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            updateThemeMutation.mutate({
                              id: editingTheme.id,
                              theme: editingTheme.theme,
                              description: editingTheme.description || '',
                              isActive: editingTheme.isActive,
                            })
                          }
                          disabled={updateThemeMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTheme(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditingTheme({
                            ...theme,
                            description: theme.description || '',
                          })
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Date Overrides Section */}
      <section className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">Date Overrides</h2>

        <div className="flex gap-4 mb-6 flex-wrap">
          <Input
            type="date"
            value={overrideDate}
            onChange={(e) => setOverrideDate(e.target.value)}
            className="w-40 bg-white/5 border-white/10 text-white"
          />
          <Input
            placeholder="Theme name"
            value={overrideTheme.theme}
            onChange={(e) =>
              setOverrideTheme({ ...overrideTheme, theme: e.target.value })
            }
            className="bg-white/5 border-white/10 text-white"
          />
          <Input
            placeholder="Description"
            value={overrideTheme.description}
            onChange={(e) =>
              setOverrideTheme({ ...overrideTheme, description: e.target.value })
            }
            className="bg-white/5 border-white/10 text-white"
          />
          <Button
            onClick={() =>
              addOverrideMutation.mutate({
                date: overrideDate,
                ...overrideTheme,
              })
            }
            disabled={
              !overrideDate ||
              !overrideTheme.theme ||
              addOverrideMutation.isPending
            }
          >
            <Calendar className="w-4 h-4 mr-2" /> Set Override
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                  Date
                </th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                  Theme
                </th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                  Description
                </th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {overrides.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 px-4 text-center text-zinc-500">
                    No overrides set
                  </td>
                </tr>
              ) : (
                overrides.map((override) => (
                  <tr key={override.id} className="border-b border-white/5">
                    <td className="py-2 px-4 text-zinc-300">{override.date}</td>
                    <td className="py-2 px-4 text-white font-medium">
                      {override.theme}
                    </td>
                    <td className="py-2 px-4 text-zinc-400">
                      {override.description}
                    </td>
                    <td className="py-2 px-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400"
                        onClick={() =>
                          deleteOverrideMutation.mutate(override.id)
                        }
                        disabled={deleteOverrideMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
