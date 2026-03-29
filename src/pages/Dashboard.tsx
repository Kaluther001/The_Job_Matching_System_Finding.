import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, Clock, Search } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import Loader from '../components/Loader';

export default function Dashboard() {
  const { userData } = useAuth();
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (userData?.role === 'employer') {
          const q = query(
            collection(db, 'jobs'),
            where('employerId', '==', userData.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const snapshot = await getDocs(q);
          setRecentJobs(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
        } else {
          const q = query(
            collection(db, 'jobs'),
            where('status', '==', 'open'),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const snapshot = await getDocs(q);
          setRecentJobs(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'jobs');
      } finally {
        setLoading(false);
      }
    };

    if (userData) {
      fetchDashboardData();
    }
  }, [userData]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userData?.name}</h1>
        <p className="text-gray-500 mt-1">
          {userData?.role === 'employer' ? 'Manage your job postings and find candidates.' : 'Find your next career opportunity.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {userData?.role === 'employer' ? 'Your Recent Postings' : 'Latest Job Openings'}
              </h2>
              <Link to="/jobs" className="text-sm text-black font-medium hover:underline">View all</Link>
            </div>
            
            {recentJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No jobs found.
              </div>
            ) : (
              <div className="space-y-4">
                {recentJobs.map(job => (
                  <Link key={job.id} to={`/jobs/${job.id}`} className="block border border-gray-200 rounded-lg p-4 hover:border-black transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-black">{job.title}</h3>
                        <p className="text-sm text-gray-500">{job.employerName}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === 'open' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-gray-500 space-x-4">
                      <div className="flex items-center">
                        <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {job.location}
                      </div>
                      <div className="flex items-center">
                        <Briefcase className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {job.category}
                      </div>
                      <div className="flex items-center">
                        <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {new Date(job.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {userData?.role === 'employer' ? (
                <Link to="/jobs?new=true" className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800">
                  Post a New Job
                </Link>
              ) : (
                <Link to="/jobs" className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800">
                  <Search className="mr-2 h-4 w-4" /> Search Jobs
                </Link>
              )}
              <Link to="/profile" className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Update Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
