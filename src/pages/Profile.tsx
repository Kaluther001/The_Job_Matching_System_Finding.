import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, MapPin, Briefcase, Building2, Save, Award, MessageCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import Loader from '../components/Loader';

export default function Profile() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userData) return;
      try {
        const collectionName = userData.role === 'employer' ? 'employerProfiles' : 'jobSeekerProfiles';
        const docRef = doc(db, collectionName, userData.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `${userData.role === 'employer' ? 'employerProfiles' : 'jobSeekerProfiles'}/${userData.uid}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !profile) return;
    setSaving(true);
    setSuccessMsg('');
    try {
      const collectionName = userData.role === 'employer' ? 'employerProfiles' : 'jobSeekerProfiles';
      const docRef = doc(db, collectionName, userData.uid);
      
      const updatedData = { ...profile, updatedAt: new Date().toISOString() };
      
      // Ensure arrays are properly formatted if they were edited as strings
      if (userData.role === 'job_seeker') {
        if (typeof updatedData.skills === 'string') {
          updatedData.skills = updatedData.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        if (typeof updatedData.qualifications === 'string') {
          updatedData.qualifications = updatedData.qualifications.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      await updateDoc(docRef, updatedData);
      setProfile(updatedData);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${userData.role === 'employer' ? 'employerProfiles' : 'jobSeekerProfiles'}/${userData.uid}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-black">Profile Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and preferences.</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${userData?.role === 'employer' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}>
              {userData?.role === 'employer' ? 'Employer' : 'Job Seeker'}
            </span>
          </div>
        </div>
        
        {successMsg && (
          <div className="bg-gray-50 border-l-4 border-black p-4 mx-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-black">{successMsg}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <form onSubmit={handleSave} className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <User className="h-4 w-4 mr-2" /> Full Name
              </dt>
              <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                <input type="text" disabled value={userData?.name || ''} className="bg-gray-50 block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border" />
                <p className="mt-1 text-xs text-gray-500">Name is managed via Google Account.</p>
              </dd> 
            </div>

            {userData?.role === 'employer' ? (
              <>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" /> Company Name
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <input type="text" required value={profile?.companyName || ''} onChange={e => setProfile({...profile, companyName: e.target.value})} className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border" />
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" /> Location
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <input type="text" required value={profile?.location || ''} onChange={e => setProfile({...profile, location: e.target.value})} className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border" />
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Briefcase className="h-4 w-4 mr-2" /> Company Description
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <textarea rows={4} required value={profile?.description || ''} onChange={e => setProfile({...profile, description: e.target.value})} className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border" />
                  </dd>
                </div>
              </>
            ) : (
              <>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" /> Preferred Location
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <input type="text" required value={profile?.location || ''} onChange={e => setProfile({...profile, location: e.target.value})} className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border" />
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Award className="h-4 w-4 mr-2" /> Skills (comma-separated)
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <input type="text" required value={Array.isArray(profile?.skills) ? profile.skills.join(', ') : profile?.skills || ''} onChange={e => setProfile({...profile, skills: e.target.value})} className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border" />
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Briefcase className="h-4 w-4 mr-2" /> Qualifications (comma-separated)
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <input type="text" required value={Array.isArray(profile?.qualifications) ? profile.qualifications.join(', ') : profile?.qualifications || ''} onChange={e => setProfile({...profile, qualifications: e.target.value})} className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border" />
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <MessageCircle className="h-4 w-4 mr-2" /> Bio
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <textarea rows={4} required value={profile?.bio || ''} onChange={e => setProfile({...profile, bio: e.target.value})} className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border" />
                  </dd>
                </div>
              </>
            )}
            
            <div className="py-4 sm:py-5 px-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none disabled:opacity-50"
              >
                <Save className="-ml-1 mr-2 h-5 w-5" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
