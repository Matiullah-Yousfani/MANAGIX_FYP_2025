import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';

const QAReview = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasksForReview();
  }, []);

  const fetchTasksForReview = async () => {
    try {
      setLoading(true);
      // Fetches tasks that have status "Submitted" or "Pending Review"
      // Based on your backend, ensure this endpoint returns the fileBase64
      const res = await api.get('/tasks/pending-review');
      setTasks(res.data);
    } catch (err) {
      console.error("Error fetching review queue");
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (taskId: string, decision: 'approve' | 'reject') => {
    const comment = prompt(`Enter ${decision} comment:`);
    if (comment === null) return; // User cancelled

    try {
      // Backend Functions: 
      // ApproveTask: [POST] .../api/tasks/{taskId}/approve
      // RejectTask: [POST] .../api/tasks/{taskId}/reject
      const endpoint = decision === 'approve' ? 'approve' : 'reject';
      await api.post(`/tasks/${taskId}/${endpoint}`, { comment });
      
      alert(`Task successfully ${decision}ed`);
      fetchTasksForReview(); // Refresh the list
    } catch (err) {
      alert("Failed to update task status");
    }
  };

  if (loading) return <div className="p-10">Loading review queue...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Quality Assurance</h1>
      <p className="text-gray-500 mb-8">Review submitted deliverables and approve for milestone progress.</p>

      

      <div className="grid grid-cols-1 gap-6">
        {tasks.length === 0 ? (
          <div className="bg-white p-10 text-center rounded-2xl border border-dashed text-gray-400">
            No tasks currently pending review.
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.taskId} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg">{task.title}</h3>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold uppercase">
                    Pending Review
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{task.description}</p>
                
                {/* Deliverable Download Section */}
                <div className="inline-flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                   <span className="text-xl">📄</span>
                   <div className="flex flex-col">
                     <span className="text-xs font-bold text-gray-400">Deliverable File</span>
                     <a 
                      href={`data:application/octet-stream;base64,${task.fileBase64}`} 
                      download={`Review_Task_${task.taskId}`}
                      className="text-blue-600 text-sm font-bold hover:underline"
                    >
                      Download to Review
                    </a>
                   </div>
                </div>
              </div>
              
              <div className="flex gap-3 ml-6">
                <button 
                  onClick={() => handleDecision(task.taskId, 'reject')}
                  className="px-6 py-2 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 transition"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleDecision(task.taskId, 'approve')}
                  className="px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition"
                >
                  Approve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QAReview;