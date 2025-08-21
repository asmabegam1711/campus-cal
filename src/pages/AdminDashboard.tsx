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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Settings className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {user.name}</p>
            </div>
          </div>
          <Button onClick={logout} variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Timetables</p>
                  <p className="text-2xl font-bold">{timetables.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Classes Managed</p>
                  <p className="text-2xl font-bold">{new Set(timetables.map(tt => tt.className)).size}</p>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
                  <p className="text-2xl font-bold">
                    {timetables.filter(tt => {
                      const daysDiff = (new Date().getTime() - tt.createdAt.getTime()) / (1000 * 3600 * 24);
                      return daysDiff <= 7;
                    }).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-success" />
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
                          <div className="p-2 bg-primary/10 rounded">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{timetable.className}</p>
                            <p className="text-sm text-muted-foreground">
                              Created by {timetable.createdBy} on {timetable.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{timetable.entries.length} periods</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTimetable(timetable)}
                          >
                            View
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
                            <p className="font-semibold text-lg">{timetable.className}</p>
                            <p className="text-sm text-muted-foreground">
                              Created by {timetable.createdBy} • {timetable.createdAt.toLocaleDateString()} • {timetable.entries.length} periods scheduled
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTimetable(timetable)}
                          >
                            View Details
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
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Timetable Details - {selectedTimetable.className}</CardTitle>
                  <CardDescription>
                    Created by {selectedTimetable.createdBy} on {selectedTimetable.createdAt.toLocaleDateString()}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => setSelectedTimetable(null)}>
                  Close
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