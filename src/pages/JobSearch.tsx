import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Briefcase, Plus, X, Edit2, Eye, EyeOff } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import Loader from '../components/Loader';

export default function JobSearch() {
  const { userData } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewJobModal, setShowNewJobModal] = useState(searchParams.get('new') === 'true');
  
  // Search filters
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');

  // New Job Form
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    qualifications: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Edit Job Form
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editJob, setEditJob] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    qualifications: '',
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let q;
      if (userData?.role === 'employer') {
        q = query(
          collection(db, 'jobs'),
          where('employerId', '==', userData.uid),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'jobs'),
          where('status', '==', 'open'),
          orderBy('createdAt', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      let fetchedJobs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

      // Client-side filtering for job seekers
      if (userData?.role === 'job_seeker') {
        if (keyword) {
          fetchedJobs = fetchedJobs.filter(job => 
            job.title.toLowerCase().includes(keyword.toLowerCase()) || 
            job.description.toLowerCase().includes(keyword.toLowerCase())
          );
        }
        if (location) {
          fetchedJobs = fetchedJobs.filter(job => 
            job.location.toLowerCase().includes(location.toLowerCase())
          );
        }
        if (category) {
          fetchedJobs = fetchedJobs.filter(job => 
            job.category.toLowerCase().includes(category.toLowerCase())
          );
        }
      }

      setJobs(fetchedJobs);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [userData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setSubmitError('');
      
      if (!userData?.uid) {
        throw new Error('User not authenticated');
      }
      
      // Validate inputs
      if (!newJob.title.trim() || !newJob.location.trim() || !newJob.category.trim()) {
        throw new Error('Please fill in all required fields');
      }

      const jobData = {
        title: newJob.title.trim(),
        description: newJob.description.trim(),
        employerId: userData.uid,
        employerName: userData.name,
        location: newJob.location.trim(),
        category: newJob.category.trim(),
        qualifications: newJob.qualifications.split(',').map(q => q.trim()).filter(Boolean),
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      
      await addDoc(collection(db, 'jobs'), jobData);
      
      setShowNewJobModal(false);
      setNewJob({ title: '', description: '', location: '', category: '', qualifications: '' });
      setSearchParams({});
      
      // Refresh jobs list
      await fetchJobs();
    } catch (err: any) {
      console.error('Create job error:', err);
      setSubmitError(err.message || 'Failed to post job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId: string, jobTitle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (err: any) {
      console.error('Delete job error:', err);
      handleFirestoreError(err, OperationType.DELETE, 'jobs');
    }
  };

  const handleOpenEditModal = (job: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingJobId(job.id);
    setEditJob({
      title: job.title,
      description: job.description,
      location: job.location,
      category: job.category,
      qualifications: Array.isArray(job.qualifications) ? job.qualifications.join(', ') : job.qualifications,
    });
    setShowEditModal(true);
  };

  const handleStatusToggle = async (jobId: string, currentStatus: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const newStatus = currentStatus === 'open' ? 'closed' : 'open';
      await updateDoc(doc(db, 'jobs', jobId), { status: newStatus });
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
    } catch (err: any) {
      console.error('Status update error:', err);
      handleFirestoreError(err, OperationType.UPDATE, `jobs/${jobId}`);
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJobId) return;

    try {
      setSubmitting(true);
      setSubmitError('');

      if (!editJob.title.trim() || !editJob.location.trim() || !editJob.category.trim()) {
        throw new Error('Please fill in all required fields');
      }

      const updatedData = {
        title: editJob.title.trim(),
        description: editJob.description.trim(),
        location: editJob.location.trim(),
        category: editJob.category.trim(),
        qualifications: editJob.qualifications.split(',').map(q => q.trim()).filter(Boolean),
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'jobs', editingJobId), updatedData);

      setShowEditModal(false);
      setEditingJobId(null);
      setEditJob({ title: '', description: '', location: '', category: '', qualifications: '' });

      // Refresh jobs list
      await fetchJobs();
    } catch (err: any) {
      console.error('Update job error:', err);
      setSubmitError(err.message || 'Failed to update job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {userData?.role === 'employer' ? 'My Job Postings' : 'Find Jobs'}
        </h1>
        {userData?.role === 'employer' && (
          <button
            onClick={() => setShowNewJobModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Post New Job
          </button>
        )}
      </div>

      {userData?.role === 'job_seeker' && (
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="keyword" className="sr-only">Keyword</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="keyword"
                  className="focus:ring-black focus:border-black block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  placeholder="Job title, keywords, or company"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="location" className="sr-only">Location</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="location"
                  className="focus:ring-black focus:border-black block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  placeholder="City, state, or remote"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {jobs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No jobs found matching your criteria.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <li key={job.id}>
                  <div className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                        <p className="text-lg font-medium text-black truncate hover:text-gray-700">{job.title}</p>
                        <p className="text-sm text-gray-500 truncate">{job.employerName}</p>
                      </Link>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${job.status === 'open' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}>
                          {job.status}
                        </span>
                        {userData?.role === 'employer' && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleStatusToggle(job.id, job.status, e)}
                              title={job.status === 'open' ? 'Close job posting' : 'Open job posting'}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:bg-green-100 hover:text-green-600 focus:outline-none transition-colors"
                            >
                              {job.status === 'open' ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(job, e)}
                              title="Edit job"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:bg-blue-100 hover:text-blue-600 focus:outline-none transition-colors"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteJob(job.id, job.title, e)}
                              title="Delete job"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 focus:outline-none transition-colors"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500 sm:mr-6">
                          <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {job.location}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <Briefcase className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {job.category}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>Posted {new Date(job.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* New Job Modal */}
      {showNewJobModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black-0 bg-opacity-50 transition-opacity z-40" 
     aria-hidden="true" 
     onClick={() => setShowNewJobModal(false)}>
</div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Post a New Job</h3>
                  <button onClick={() => setShowNewJobModal(false)} className="text-gray-400 hover:text-gray-500" disabled={submitting}>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {submitError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                    {submitError}
                  </div>
                )}
                
                <form onSubmit={handleCreateJob}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">Job Title *</label>
                      <input type="text" id="title" required value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting} />
                    </div>
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category *</label>
                      <input type="text" id="category" required value={newJob.category} onChange={e => setNewJob({...newJob, category: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting} />
                    </div>
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location *</label>
                      <input type="text" id="location" required value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting} />
                    </div>
                    <div>
                      <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700">Qualifications (comma-separated)</label>
                      <input type="text" id="qualifications" value={newJob.qualifications} onChange={e => setNewJob({...newJob, qualifications: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting} />
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description *</label>
                      <textarea id="description" rows={4} required value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting}></textarea>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button type="submit" disabled={submitting} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-black text-base font-medium text-white hover:bg-gray-800 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {submitting ? 'Posting...' : 'Post Job'}
                    </button>
                    <button type="button" onClick={() => setShowNewJobModal(false)} disabled={submitting} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showEditModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black-0 bg-opacity-50 transition-opacity z-40" 
     aria-hidden="true" 
     onClick={() => !submitting && setShowEditModal(false)}>
</div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Edit Job</h3>
                  <button onClick={() => !submitting && setShowEditModal(false)} className="text-gray-400 hover:text-gray-500" disabled={submitting}>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {submitError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                    {submitError}
                  </div>
                )}
                
                <form onSubmit={handleUpdateJob}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">Job Title *</label>
                      <input type="text" id="edit-title" required value={editJob.title} onChange={e => setEditJob({...editJob, title: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting} />
                    </div>
                    <div>
                      <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700">Category *</label>
                      <input type="text" id="edit-category" required value={editJob.category} onChange={e => setEditJob({...editJob, category: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting} />
                    </div>
                    <div>
                      <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700">Location *</label>
                      <input type="text" id="edit-location" required value={editJob.location} onChange={e => setEditJob({...editJob, location: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting} />
                    </div>
                    <div>
                      <label htmlFor="edit-qualifications" className="block text-sm font-medium text-gray-700">Qualifications (comma-separated)</label>
                      <input type="text" id="edit-qualifications" value={editJob.qualifications} onChange={e => setEditJob({...editJob, qualifications: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting} />
                    </div>
                    <div>
                      <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Description *</label>
                      <textarea id="edit-description" rows={4} required value={editJob.description} onChange={e => setEditJob({...editJob, description: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" disabled={submitting}></textarea>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button type="submit" disabled={submitting} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-black text-base font-medium text-white hover:bg-gray-800 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {submitting ? 'Updating...' : 'Update Job'}
                    </button>
                    <button type="button" onClick={() => !submitting && setShowEditModal(false)} disabled={submitting} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
