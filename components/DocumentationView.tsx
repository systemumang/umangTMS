import React, { useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

type DocSection = {
  title: string;
  steps: string[];
};

export const DocumentationView: React.FC = () => {
  const sections: DocSection[] = useMemo(() => {
    return [
      {
        title: '1) Login',
        steps: [
          'Open the application URL.',
          'Enter Email Address.',
          'Enter Password (use the eye icon to show/hide if needed).',
          'Click Login.',
          'Confirm you land inside the app (menu + main content).',
        ],
      },
      {
        title: '2) Navigation & Layout',
        steps: [
          'Use the top-right layout toggle to switch between Side and Top navigation.',
          'In Side layout, expand/collapse sections from the left menu headers.',
          'Note: Master section is visible only for Admin users.',
        ],
      },
      {
        title: '3) Dashboard',
        steps: [
          'Left Menu → Dashboard.',
          'Confirm dashboard widgets load (cards/charts/summary).',
        ],
      },
      {
        title: '4) Master Setup (Admin)',
        steps: [
          'Left Menu → Master → Firms: add/edit a firm.',
          'Left Menu → Master → Categories: add/edit a category.',
          'Left Menu → Master → Status: add/edit a status (system statuses may be locked).',
          'Left Menu → Master → Designation: add/edit a designation.',
          'Left Menu → Master → Users: add/edit user; toggle active/inactive.',
          'Left Menu → Master → Settings: view (change only if needed).',
          'Left Menu → Master → Telegram Setup: view (configure only if needed).',
        ],
      },
      {
        title: '5) Simple Tasks (Core Flow)',
        steps: [
          'Left Menu → Simple Tasks → All Tasks: verify list loads.',
          'Use Search to find a task by keyword.',
          'Open Filters: test Status/Priority/Project/Client/Owner/Assignee/Category/Firm and date filters, then Clear Filters.',
          'Create a task: click Add Task, fill required fields, then Save Task.',
          'Update a task: open Update, change Status, add Remarks where required, add Hours/Achieved (if goal is set), then Confirm Update.',
          'Edit a task: open Edit and Save Changes.',
          'Open Pending and Completed views and confirm the task appears as expected after status updates.',
          'Open Activity Dashboard and verify it renders.',
          'Open Action Log and verify updates appear; test Filters; open Photo/PDF from a log if available.',
        ],
      },
      {
        title: '6) Recurring Tasks',
        steps: [
          'Left Menu → Recurring Tasks → Recurring Master: add a recurring task rule and Save Task.',
          'Update a recurring task: use Update, set Status + Remarks, then Confirm Update (logs should be created).',
          'Open Due Recurring and confirm due logic list appears.',
          'Open Recurring Log and verify history/filters.',
        ],
      },
      {
        title: '7) Logout / Exit',
        steps: [
          'Use Logout to sign out.',
          'Use Exit to clear workspace/session and return to initial state.',
        ],
      },
    ];
  }, []);

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    const maxWidth = pageWidth - margin * 2;
    let y = 56;

    const ensureRoom = (needed: number) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y + needed <= pageHeight - margin) return;
      doc.addPage();
      y = 56;
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('TaskPro — Application Walkthrough', margin, y);
    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 18;

    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    sections.forEach((section) => {
      ensureRoom(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(section.title, margin, y);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);

      section.steps.forEach((step, index) => {
        const bullet = `${index + 1}. ${step}`;
        const lines = doc.splitTextToSize(bullet, maxWidth);
        ensureRoom(lines.length * 14 + 6);
        doc.text(lines, margin, y);
        y += lines.length * 14 + 4;
      });

      y += 6;
    });

    doc.save('TaskPro-Documentation.pdf');
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-indigo-600 uppercase tracking-tight">Documentation</h2>
              <p className="text-sm text-gray-600 mt-1">Step-by-step walkthrough for demo & testing</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadPdf}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm text-sm font-bold uppercase tracking-wider"
          title="Download PDF"
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100">
              <h3 className="text-sm font-black text-indigo-700 uppercase tracking-widest">{section.title}</h3>
            </div>
            <div className="p-5">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800">
                {section.steps.map((step) => (
                  <li key={step} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

