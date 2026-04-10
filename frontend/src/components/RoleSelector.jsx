import Button from './Button'

function RoleSelector({ name, onSelect }) {
  return (
    <>
      <div className="section-heading">
        <span className="eyebrow">Step 2</span>
        <h2>Are You a Student or Teacher?</h2>
        <p>{name}, choose your role to unlock the correct timetable workflow.</p>
      </div>
      <div className="option-grid">
        <Button className="option-card" variant="option" onClick={() => onSelect('student')}>
          <span className="option-card__eyebrow">Interactive workspace</span>
          <strong>Student</strong>
          <span>Upload your own timetable, choose a class template, and ask natural questions in chat.</span>
        </Button>
        <Button className="option-card" variant="option" onClick={() => onSelect('teacher')}>
          <span className="option-card__eyebrow">Management console</span>
          <strong>Teacher</strong>
          <span>Add lectures, review your day-wise schedule, and keep the event timetable updated live.</span>
        </Button>
      </div>
    </>
  )
}

export default RoleSelector
