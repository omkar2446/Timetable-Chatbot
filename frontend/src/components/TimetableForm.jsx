import { CLASS_OPTIONS, DAY_OPTIONS } from '../utils/time'

function TimetableForm({
  mode,
  title,
  subtitle,
  entry,
  entries,
  onEntryChange,
  onAddEntry,
  onRemoveEntry,
  onSave,
  onSecondaryAction,
  loading,
  compact = false,
}) {
  const updateField = (field, value) => {
    onEntryChange((current) => ({ ...current, [field]: value }))
  }

  const isTeacher = mode === 'teacher'

  return (
    <div className={compact ? 'compact-form' : ''}>
      <div className="section-heading">
        <span className="eyebrow">{isTeacher ? 'Teacher Panel' : 'Student Upload'}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="form-grid">
        {isTeacher && (
          <input
            className="text-input"
            value={entry.teacherName || ''}
            onChange={(event) => updateField('teacherName', event.target.value)}
            placeholder="Teacher name"
          />
        )}
        <select className="text-input" value={entry.day} onChange={(event) => updateField('day', event.target.value)}>
          {DAY_OPTIONS.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
        <input
          className="text-input"
          value={entry.time}
          onChange={(event) => updateField('time', event.target.value)}
          placeholder="09:30 AM"
        />
        <input
          className="text-input"
          value={entry.subject}
          onChange={(event) => updateField('subject', event.target.value)}
          placeholder="Subject"
        />
        {!isTeacher && (
          <input
            className="text-input"
            value={entry.teacher}
            onChange={(event) => updateField('teacher', event.target.value)}
            placeholder="Teacher Name"
          />
        )}
        {isTeacher && (
          <select
            className="text-input"
            value={entry.className}
            onChange={(event) => updateField('className', event.target.value)}
          >
            {CLASS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="action-row">
        {!isTeacher && (
          <button className="ghost-button" onClick={onAddEntry}>
            Add Entry
          </button>
        )}
        <button className="primary-button" onClick={onSave} disabled={loading}>
          {loading ? 'Saving...' : isTeacher ? 'Save Lecture' : 'Save Timetable'}
        </button>
        {isTeacher && onSecondaryAction && (
          <button className="ghost-button" onClick={onSecondaryAction} disabled={loading}>
            Open Dashboard
          </button>
        )}
      </div>

      {!!entries?.length && (
        <div className="entry-list">
          {entries.map((item, index) => (
            <div className="entry-item" key={`${item.day}-${item.time}-${item.subject}-${index}`}>
              <div>
                <strong>{item.subject}</strong>
                <span>
                  {item.day} | {item.time} | {item.teacher}
                  {item.className ? ` | ${item.className}` : ''}
                </span>
              </div>
              {!isTeacher && onRemoveEntry && (
                <button className="mini-button" onClick={() => onRemoveEntry(index)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TimetableForm
