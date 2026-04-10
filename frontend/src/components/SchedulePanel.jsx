import LoadingSkeleton from './LoadingSkeleton'

function SchedulePanel({ todayData, role, loading }) {
  return (
    <div className="glass-card schedule-panel">
      <div className="section-heading">
        <span className="eyebrow">Today</span>
        <h2>{todayData.greeting || 'Schedule Overview'}</h2>
        <p>{todayData.day ? `${todayData.day} schedule` : 'Waiting for timetable data...'}</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Current Lecture</span>
          {loading ? <LoadingSkeleton lines={1} compact /> : <strong>{todayData.currentLecture?.subject || 'No live lecture'}</strong>}
        </div>
        <div className="summary-card">
          <span>Next Lecture</span>
          {loading ? <LoadingSkeleton lines={1} compact /> : <strong>{todayData.nextLecture?.subject || 'No upcoming lecture'}</strong>}
        </div>
      </div>

      <div className="schedule-list">
        {loading ? (
          <LoadingSkeleton lines={4} />
        ) : todayData.lectures?.length ? (
          todayData.lectures.map((lecture) => (
            <article
              key={`${lecture.day}-${lecture.time}-${lecture.subject}-${lecture.teacher}`}
              className={`schedule-item ${lecture.isCurrent ? 'current' : ''} ${lecture.isNext ? 'next' : ''}`}
            >
              <div>
                <strong>{lecture.subject}</strong>
                <span>
                  {lecture.time} to {lecture.endTime || lecture.time} | {lecture.teacher}
                  {lecture.className ? ` | ${lecture.className}` : ''}
                </span>
              </div>
              <span className="schedule-flag">
                {lecture.isCurrent ? 'Live' : lecture.isNext ? 'Up Next' : role === 'teacher' ? 'Teaching' : 'Scheduled'}
              </span>
            </article>
          ))
        ) : (
          <p className="empty-state">No lectures scheduled for today yet.</p>
        )}
      </div>
    </div>
  )
}

export default SchedulePanel
