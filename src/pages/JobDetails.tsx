import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { MapPin, Briefcase, Calendar, MessageSquare, Building2, CheckCircle2, Trash2, Edit2, X, Eye, EyeOff } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import Loader from '../components/Loader';

export default function JobDetails() {
  const { jobId } = useParams();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [editJob, setEditJob] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    qualifications: '',
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        if (!jobId) return;
        const jobDoc = await getDoc(doc(db, 'jobs', jobId));
        if (jobDoc.exists()) {
          setJob({ id: jobDoc.id, ...(jobDoc.data() as any) });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `jobs/${jobId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleDeleteJob = async () => {
    if (!confirm(`Are you sure you want to delete this job? This action cannot be undone.`)) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');
      
      if (!jobId) {
        throw new Error('Job ID not found');
      }
      
      console.log('Delete started for job:', jobId);
      console.log('Current user UID:', userData?.uid);
      console.log('Job employerId:', job?.employerId);
      
      await deleteDoc(doc(db, 'jobs', jobId));
      
      console.log('Delete successful');
      
      // Show success screen
      setShowDeleteSuccess(true);
    } catch (err: any) {
      console.error('Delete job error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Full error:', JSON.stringify(err));
      
      let errorMsg = err.message || 'Failed to delete job. Please try again.';
      
      // Map Firebase error codes to user-friendly messages
      if (err.code === 'permission-denied') {
        errorMsg = `Permission Error: ${err.message}. Rules should allow all deletes. Job Owner UID: ${job?.employerId}. Your UID: ${userData?.uid}`;
      } else if (err.code === 'not-found') {
        errorMsg = 'Job not found or has already been deleted.';
      } else if (err.code === 'unauthenticated') {
        errorMsg = 'You are not logged in. Please log in and try again.';
      }
      
      setSubmitError(errorMsg);
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!job) return;
    setSubmitError('');
    const quals = Array.isArray(job.qualifications) ? job.qualifications.join(', ') : (job.qualifications || '');
    setEditJob({
      title: job.title || '',
      description: job.description || '',
      location: job.location || '',
      category: job.category || '',
      qualifications: quals,
    });
    setShowEditModal(true);
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) {
      setSubmitError('Job ID not found');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');

      // Validate required fields
      if (!editJob.title?.trim()) {
        throw new Error('Job title is required');
      }
      if (!editJob.description?.trim()) {
        throw new Error('Job description is required');
      }
      if (!editJob.location?.trim()) {
        throw new Error('Location is required');
      }
      if (!editJob.category?.trim()) {
        throw new Error('Category is required');
      }

      // Parse qualifications properly
      const qualArray = editJob.qualifications
        ? editJob.qualifications.split(',').map((q: string) => q.trim()).filter((q: string) => q.length > 0)
        : [];

      const updatedData: any = {
        title: editJob.title.trim(),
        description: editJob.description.trim(),
        location: editJob.location.trim(),
        category: editJob.category.trim(),
        qualifications: qualArray,
        updatedAt: new Date().toISOString(),
      };

      console.log('Updating job with data:', updatedData);
      console.log('Job ID:', jobId);
      console.log('User UID:', userData?.uid);
      
      await updateDoc(doc(db, 'jobs', jobId), updatedData);

      console.log('Update successful');
      
      // Success - refresh and close
      const updatedJob = await getDoc(doc(db, 'jobs', jobId));
      if (updatedJob.exists()) {
        setJob({ id: updatedJob.id, ...(updatedJob.data() as any) });
        console.log('Job refreshed:', updatedJob.data());
      }
      
      setShowEditModal(false);
      setEditJob({ title: '', description: '', location: '', category: '', qualifications: '' });
      setSuccessMessage('Job updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      console.error('Update job error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Full error:', JSON.stringify(err));
      
      let errorMsg = err.message || 'Failed to update job. Please try again.';
      
      // Map Firebase error codes to user-friendly messages
      if (err.code === 'permission-denied') {
        errorMsg = `Permission Error: ${err.message}. Rules should allow all writes. Job Owner UID: ${job?.employerId}. Your UID: ${userData?.uid}`;
      } else if (err.code === 'not-found') {
        errorMsg = 'Job not found or has been deleted.';
      } else if (err.code === 'unauthenticated') {
        errorMsg = 'You are not logged in. Please log in and try again.';
      }
      
      setSubmitError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!jobId || !job) return;
    try {
      setSubmitting(true);
      const newStatus = job.status === 'open' ? 'closed' : 'open';
      await updateDoc(doc(db, 'jobs', jobId), { status: newStatus });
      setJob({ ...job, status: newStatus });
      setSuccessMessage(`Job status changed to ${newStatus}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Status update error:', err);
      handleFirestoreError(err, OperationType.UPDATE, `jobs/${jobId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!job || !userData) return;
    setStartingChat(true);
    try {
      // Check if chat already exists
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userData.uid)
      );
      const snapshot = await getDocs(q);
      
      let existingChatId = null;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(job.employerId) && data.jobId === job.id) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        navigate(`/chat/${existingChatId}`);
      } else {
        // Create new chat
        const newChat = await addDoc(collection(db, 'chats'), {
          participants: [userData.uid, job.employerId],
          jobId: job.id,
          updatedAt: new Date().toISOString(),
        });
        navigate(`/chat/${newChat.id}`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'chats');
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) return <Loader />;
  if (!job) return <div className="text-center py-10 text-gray-500">Job not found.</div>;

  // Show delete success screen
  if (showDeleteSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Deleted Successfully!</h2>
          <p className="text-gray-600 mb-6">Your job posting has been removed.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none"
          >
            Back to Dashboard!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-t-lg text-sm">
          {submitError}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 text-sm">
          {successMessage}
        </div>
      )}
      <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
        <div>
          <h3 className="text-2xl leading-6 font-bold text-black">{job.title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 flex items-center">
            <Building2 className="h-4 w-4 mr-1" /> {job.employerName}
          </p>
        </div>
        <div className="flex gap-2">
          {userData?.role === 'job_seeker' && (
            <button
              onClick={handleStartChat}
              disabled={startingChat}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none disabled:opacity-50"
            >
              <MessageSquare className="-ml-1 mr-2 h-5 w-5" />
              {startingChat ? 'Starting Chat...' : 'Chat with Employer'}
            </button>
          )}
          {userData?.role === 'employer' && userData?.uid === job.employerId && (
            <>
              <button
                onClick={handleStatusToggle}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md shadow-sm text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none disabled:opacity-50"
                title={job.status === 'open' ? 'Close job posting' : 'Open job posting'}
              >
                {job.status === 'open' ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                <span className="ml-2">{job.status === 'open' ? 'Close' : 'Open'}</span>
              </button>
              <button
                onClick={handleOpenEditModal}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none disabled:opacity-50"
              >
                <Edit2 className="h-5 w-5" />
                <span className="ml-2">Edit</span>
              </button>
              <button
                onClick={handleDeleteJob}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5" />
                <span className="ml-2">Delete</span>
              </button>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500 flex items-center">
              <MapPin className="h-4 w-4 mr-1" /> Location
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{job.location}</dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500 flex items-center">
              <Briefcase className="h-4 w-4 mr-1" /> Category
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{job.category}</dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500 flex items-center">
              <Calendar className="h-4 w-4 mr-1" /> Posted On
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{new Date(job.createdAt).toLocaleDateString()}</dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === 'open' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}>
                {job.status}
              </span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Qualifications</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                {job.qualifications.map((qual: string, index: number) => (
                  <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                    <div className="w-0 flex-1 flex items-center">
                      <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-black" />
                      <span className="ml-2 flex-1 w-0 truncate">{qual}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Job Description</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{job.description}</dd>
          </div>
        </dl>
      </div>

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
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Edit Job</h3>
                  <button type="button" onClick={() => !submitting && setShowEditModal(false)} className="text-gray-400 hover:text-gray-500" disabled={submitting}>
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
