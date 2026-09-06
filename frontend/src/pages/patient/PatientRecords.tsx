import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { medicalRecordsApi, consultationsApi } from '../../api';
import type { MedicalRecord, Consultation } from '../../types';
import { Card, PageHeader, Badge } from '../../components/ui';

const SectionField = ({ label, value }: { label: string; value: string }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ 
      fontSize: '0.75rem', 
      fontWeight: 700, 
      textTransform: 'uppercase', 
      letterSpacing: '0.08em',
      color: 'var(--text-muted)', 
      marginBottom: '6px' 
    }}>
      {label}
    </div>
    {value ? (
      <div style={{ 
        fontSize: '0.9375rem', 
        lineHeight: 1.6, 
        color: 'var(--text)',
        padding: '10px 14px',
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        whiteSpace: 'pre-wrap'
      }}>
        {value}
      </div>
    ) : (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', padding: '10px 14px' }}>
        Not recorded
      </div>
    )}
  </div>
);

export const PatientRecords = () => {
  const { token } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const [recs, cons] = await Promise.all([
          medicalRecordsApi.getAll(token),
          consultationsApi.getAll(token)
        ]);
        setRecords(recs);
        setConsultations(cons);
        // Auto-expand the most recent record
        if (recs.length > 0) setExpandedId(recs[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const getConsultation = (consultationId: string) => 
    consultations.find(c => c.id === consultationId);

  if (loading) return (
    <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading medical records...</p>
  );

  return (
    <div>
      <PageHeader 
        title="Medical Records" 
        subtitle="Your clinical summaries are read-only. They are created and managed by your doctor." 
      />
      
      {records.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '8px', fontWeight: 500 }}>No medical records yet.</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              Records are created by your doctor after a completed consultation.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {records.map(mr => {
            const consultation = getConsultation(mr.consultation);
            const isCompleted = consultation?.status === 'COMPLETED';
            const isExpanded = expandedId === mr.id;

            return (
              <div key={mr.id} style={{ 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                backgroundColor: 'var(--surface)'
              }}>
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : mr.id)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                    backgroundColor: isExpanded ? 'var(--bg)' : 'var(--surface)',
                    userSelect: 'none',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                      {mr.chief_complaint || 'Medical Record'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {new Date(mr.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isCompleted ? (
                      <Badge variant="neutral">Completed — Read Only</Badge>
                    ) : (
                      <Badge variant="primary">Draft</Badge>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontSize: '1.25rem', lineHeight: 1 }}>
                      {isExpanded ? '−' : '+'}
                    </span>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '20px' }}>
                    <SectionField label="Chief Complaint" value={mr.chief_complaint} />
                    <SectionField label="Examination Notes" value={mr.examination_notes} />
                    
                    {/* Diagnosis highlighted */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', 
                        letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' 
                      }}>
                        Diagnosis / Assessment
                      </div>
                      {mr.diagnosis ? (
                        <div style={{ 
                          fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text)',
                          padding: '12px 16px',
                          backgroundColor: 'var(--primary-light)',
                          border: '1px solid var(--primary)',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 500
                        }}>
                          {mr.diagnosis}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', padding: '10px 14px' }}>
                          Not recorded
                        </div>
                      )}
                    </div>

                    <SectionField label="Treatment Plan" value={mr.treatment_plan} />
                    <SectionField label="Medications" value={mr.medications} />
                    <SectionField label="Doctor Notes" value={mr.doctor_notes} />
                    
                    <div style={{ 
                      marginTop: '16px', 
                      paddingTop: '16px', 
                      borderTop: '1px solid var(--border)',
                      fontSize: '0.8125rem', 
                      color: 'var(--text-muted)'
                    }}>
                      Last updated: {new Date(mr.updated_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
