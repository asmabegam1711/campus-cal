import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, LogOut, Calendar, Users, Clock, Trash2 } from 'lucide-react';
import { GeneratedTimetable } from '@/types/timetable';
import { useToast } from '@/hooks/use-toast';
import TimetableDisplay from '@/components/TimetableDisplay';

const AdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [timetables, setTimetables] = useState<GeneratedTimetable[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<GeneratedTimetable | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin') {
      navigate('/');
      return;
    }
    setUser(parsedUser);

    // Load timetables from localStorage
    const savedTimetables = JSON.parse(localStorage.getItem('timetables') || '[]');
    const parsedTimetables = savedTimetables.map((tt: any) => ({
      ...tt,
      createdAt: new Date(tt.createdAt)
    }));
    setTimetables(parsedTimetables);
  }, [navigate]);

  const deleteTimetable = (timetableId: string) => {
    const updatedTimetables = timetables.filter(tt => tt.id !== timetableId);
    setTimetables(updatedTimetables);
    localStorage.setItem('timetables', JSON.stringify(updatedTimetables));
    
    if (selectedTimetable?.id === timetableId) {
      setSelectedTimetable(null);
    }
    
    toast({
      title: "Success",
      description: "Timetable deleted successfully",
    });
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-sky-50 to-emerald-50 dark:from-violet-950 dark:via-sky-950 dark:to-emerald-950 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Settings className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Admin Dashboard</h1>
              <p className="text-muted-foreground text-lg">Welcome, {user.name} 👋</p>
            </div>
          </div>
          <Button onClick={logout} variant="outline" className="gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white border-none hover:from-red-600 hover:to-orange-600">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">📚 Total Timetables</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{timetables.length}</p>
                </div>
                <Calendar className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">🎓 Classes Managed</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{new Set(timetables.map(tt => tt.className)).size}</p>
                </div>
                <Users className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-yellow-100 dark:from-orange-950 dark:to-yellow-900 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">⚡ Recent Activity</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {timetables.filter(tt => {
                      const daysDiff = (new Date().getTime() - tt.createdAt.getTime()) / (1000 * 3600 * 24);
                      return daysDiff <= 7;
                    }).length}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timetables">All Timetables</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Timetables</CardTitle>
                <CardDescription>
                  Latest generated timetables in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timetables.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No timetables generated yet</p>
                    <p className="text-sm">Timetables created by faculty will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timetables.slice(-5).reverse().map((timetable) => (
                      <div key={timetable.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                         <div className="flex items-center gap-3">
                           <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg">
                             <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                           </div>
                           <div>
                             <p className="font-medium">📚 {timetable.className}</p>
                             <p className="text-sm text-muted-foreground">
                               👨‍🏫 Created by {timetable.createdBy} • 📅 {timetable.createdAt.toLocaleDateString()}
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <Badge variant="secondary" className="bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900">
                             🕐 {timetable.entries.length} periods
                           </Badge>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setSelectedTimetable(timetable)}
                             className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600"
                           >
                             👁️ View
                           </Button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timetables" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Generated Timetables</CardTitle>
                <CardDescription>
                  Complete list of all timetables in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timetables.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No timetables available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timetables.map((timetable) => (
                      <div key={timetable.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-primary/10 rounded">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                           <div>
                             <p className="font-semibold text-lg">📚 {timetable.className}</p>
                             <p className="text-sm text-muted-foreground">
                               👨‍🏫 Created by {timetable.createdBy} • 📅 {timetable.createdAt.toLocaleDateString()} • 🕐 {timetable.entries.length} periods scheduled
                             </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setSelectedTimetable(timetable)}
                             className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-none hover:from-blue-600 hover:to-cyan-600"
                           >
                             👁️ View Details
                           </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTimetable(timetable.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Selected Timetable Display */}
        {selectedTimetable && (
          <Card className="mt-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-800 border-slate-200">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    📋 Timetable Details - {selectedTimetable.className}
                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                      Year {selectedTimetable.year} | Sec {selectedTimetable.section} | Sem {selectedTimetable.semester}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    👨‍🏫 Created by {selectedTimetable.createdBy} on 📅 {selectedTimetable.createdAt.toLocaleDateString()}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => setSelectedTimetable(null)} className="bg-gradient-to-r from-gray-500 to-slate-600 text-white border-none hover:from-gray-600 hover:to-slate-700">
                  ❌ Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TimetableDisplay timetable={selectedTimetable} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;