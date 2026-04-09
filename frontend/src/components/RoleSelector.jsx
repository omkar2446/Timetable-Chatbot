function RoleSelector({ name, onSelect }) {
  return (
    <>
      <div className="section-heading">
        <span className="eyebrow">Step 2</span>
        <h2>Are You a Student or Teacher?</h2>
        <p>{name}, choose your role to unlock the correct timetable workflow.</p>
      </div>
      <div className="option-grid">
        <button className="option-card" onClick={() => onSelect('student')}>
          <strong>Student</strong>
          <span>Upload your own timetable or select a class template.</span>
        </button>
        <button className="option-card" onClick={() => onSelect('teacher')}>
          <strong>Teacher</strong>
          <span>Add lectures, review your schedule, and update class slots.</span>
        </button>
      </div>
    </>
  )
}

export default RoleSelector
