import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/cards/card';
import { Progress } from '@/components/ui/feedback/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/feedback/skeleton';
import { ArrowUpRight, BookOpen, Film, GraduationCap } from 'lucide-react';
import reviewsApi, { ReviewStatistics } from '@/lib/api/reviews';
import resourcesApi from '@/lib/api/resources';

export function ProgressOverview() {
  const [reviewStats, setReviewStats] = useState<ReviewStatistics | null>(null);
  const [resourceCounts, setResourceCounts] = useState({
    videos: 0,
    courses: 0,
    books: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch review statistics
        const stats = await reviewsApi.getStatistics();
        setReviewStats(stats);

        // Fetch resource counts
        const videos = await resourcesApi.getVideos();
        const courses = await resourcesApi.getCourses();
        const books = await resourcesApi.getBooks();

        setResourceCounts({
          videos: videos.length,
          courses: courses.length,
          books: books.length
        });
      } catch (error) {
        console.error('Error fetching progress data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <ProgressOverviewSkeleton />;
  }

  const completionPercentage = reviewStats ?
    Math.round((reviewStats.reviewed_concepts / (reviewStats.total_concepts || 1)) * 100) : 0;

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Learning Progress</CardTitle>
        <CardDescription>
          Track your progress across courses, videos, and reading materials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <div className="text-2xl font-bold">{completionPercentage}%</div>
                <div className="text-sm text-muted-foreground">
                  {reviewStats?.reviewed_concepts || 0} of {reviewStats?.total_concepts || 0} concepts mastered
                </div>
              </div>
              {completionPercentage > 0 && (
                <div className="flex items-center text-sm text-green-500">
                  <ArrowUpRight className="mr-1 h-4 w-4" />
                  <span>Making progress</span>
                </div>
              )}
            </div>
            <Progress className="mt-2" value={completionPercentage} />
          </div>

          <Tabs defaultValue="videos">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="videos">Videos ({resourceCounts.videos})</TabsTrigger>
              <TabsTrigger value="courses">Courses ({resourceCounts.courses})</TabsTrigger>
              <TabsTrigger value="books">Books ({resourceCounts.books})</TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="mt-4">
              <div className="flex items-center space-x-4">
                <Film className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-sm font-medium">You have {resourceCounts.videos} videos in your library</p>
                  <p className="text-sm text-muted-foreground">
                    Continue watching to improve your knowledge
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="courses" className="mt-4">
              <div className="flex items-center space-x-4">
                <GraduationCap className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-sm font-medium">You have {resourceCounts.courses} courses in progress</p>
                  <p className="text-sm text-muted-foreground">
                    Complete your courses to master new topics
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="books" className="mt-4">
              <div className="flex items-center space-x-4">
                <BookOpen className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-sm font-medium">You have {resourceCounts.books} books in your reading list</p>
                  <p className="text-sm text-muted-foreground">
                    Reading regularly helps reinforce concepts
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {reviewStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Reviews Due</div>
                <div className="mt-1 text-2xl font-bold">{reviewStats.due_reviews}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">New Concepts</div>
                <div className="mt-1 text-2xl font-bold">{reviewStats.new_concepts}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressOverviewSkeleton() {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="mt-2 h-4 w-full" />
        </div>
        <div>
          <Skeleton className="h-10 w-full" />
          <div className="mt-4 flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}