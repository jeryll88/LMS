import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-2xl shadow-lg">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.full_name}</h2>
            <p className="text-xs text-slate-500 font-mono">@{user?.username} &bull; {user?.email}</p>
            <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 uppercase">
              {user?.role} Account
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-400 uppercase font-bold block">Account User ID</span>
            <span className="font-mono font-bold text-slate-800">#{user?.user_id || user?.id}</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-400 uppercase font-bold block">Student / Employee Number</span>
            <span className="font-mono font-bold text-indigo-600">
              {user?.student_number || user?.employee_id || 'Not Assigned'}
            </span>
          </div>

          {user?.year_level && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-400 uppercase font-bold block">Academic Level</span>
              <span className="font-bold text-slate-800">Year {user?.year_level}</span>
            </div>
          )}

          {user?.course_code && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-400 uppercase font-bold block">Degree Program</span>
              <span className="font-bold text-slate-800">{user?.course_code} - {user?.course_name}</span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Account status: <span className="text-emerald-600 font-bold">Active</span>. For credential modifications or program reassignments, please visit the library administration desk.
          </p>
        </div>
      </div>
    </Layout>
  );
}
