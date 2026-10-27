import { useState, useEffect, useRef } from "react";

const TEAMS = [
  "Frontend Development",
  "Backend Development",
  "UI/UX Design",
  "Testing / QA",
  "HR",
];

const ADMIN_CREDS = {
  username: "admin",
  password: "admin123",
};

const DEFAULT_PASSWORD = "password123";
const STORAGE_KEY = "teamhub-state";

/* ---------- Helpers ---------- */

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// "2026-10-02" -> "Oct 2, 2026"
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Only allow http/https links (blocks "javascript:" and similar).
function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function defaultState() {
  return {
    employees: [
      {
        id: 1,
        name: "Mohammed Shoaib",
        email: "shoaib@company.com",
        team: "Backend Development",
        username: "shoaib",
        password: DEFAULT_PASSWORD,
      },
      {
        id: 2,
        name: "Sinchana Patil",
        email: "sinchana@company.com",
        team: "UI/UX Design",
        username: "sinchana",
        password: DEFAULT_PASSWORD,
      },
      {
        id: 3,
        name: "Mohammed HMG",
        email: "hmg@company.com",
        team: "Frontend Development",
        username: "hmg",
        password: DEFAULT_PASSWORD,
      },
      {
        id: 4,
        name: "Sanketh K Samantri",
        email: "sanketh@company.com",
        team: "Testing / QA",
        username: "sanketh",
        password: DEFAULT_PASSWORD,
      },
    ],
    announcements: [
      {
        id: 1,
        text: "Project deadline has changed — new submission date is Friday.",
        target: "Backend Development",
        date: "Sep 24",
      },
      {
        id: 2,
        text: "Office will be closed for maintenance this Saturday.",
        target: "all",
        date: "Sep 22",
      },
    ],
    meetings: [
      {
        id: 3,
        title: "Sprint review",
        team: "all",
        date: "2026-10-02",
        time: "11:00",
        link: "https://teams.microsoft.com/l/meetup-join/demo",
      },
      {
        id: 4,
        title: "Design walkthrough",
        team: "UI/UX Design",
        date: "2026-10-04",
        time: "15:30",
        link: "https://teams.microsoft.com/l/meetup-join/demo2",
      },
    ],
    nextId: 5,
  };
}

function loadState() {
  const defaults = defaultState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const saved = JSON.parse(raw);

      const employees = Array.isArray(saved.employees)
        ? saved.employees.map((emp) => ({
            ...emp,
            username:
              emp.username ||
              (emp.email || "").split("@")[0].toLowerCase(),
            password: emp.password || DEFAULT_PASSWORD,
          }))
        : defaults.employees;

      const announcements = Array.isArray(saved.announcements)
        ? saved.announcements
        : defaults.announcements;

      const meetings = Array.isArray(saved.meetings)
        ? saved.meetings
        : defaults.meetings;

      // Make sure nextId can never collide with an existing id.
      const highestId = [...announcements, ...meetings].reduce(
        (max, item) => Math.max(max, Number(item.id) || 0),
        0
      );

      return {
        employees,
        announcements,
        meetings,
        nextId: Math.max(Number(saved.nextId) || 0, highestId + 1),
      };
    }
  } catch (error) {
    console.error("Could not load saved data:", error);
  }

  return defaults;
}

export default function App() {
  const [data, setData] = useState(loadState);
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState("admin");
  const [currentEmpId, setCurrentEmpId] = useState(null);
  const [view, setView] = useState("employees");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Could not save data:", error);
    }
  }, [data]);

  // ADMIN AND EMPLOYEE LOGIN
  function attemptLogin(e) {
    e.preventDefault();

    const username = loginUser.trim().toLowerCase();

    if (role === "admin") {
      if (
        username === ADMIN_CREDS.username &&
        loginPass === ADMIN_CREDS.password
      ) {
        setCurrentEmpId(null);
        setLoggedIn(true);
        setView("employees");
        setLoginError("");
        setLoginPass("");
        return;
      }
    } else {
      const employee = data.employees.find(
        (emp) =>
          emp.username?.toLowerCase() === username &&
          emp.password === loginPass
      );

      if (employee) {
        setCurrentEmpId(employee.id);
        setLoggedIn(true);
        setView("myprofile");
        setLoginError("");
        setLoginPass("");
        return;
      }
    }

    setLoginError("Incorrect username or password.");
    setLoginPass("");
  }

  // LOGOUT
  function logout() {
    setLoggedIn(false);
    setCurrentEmpId(null);
    setLoginUser("");
    setLoginPass("");
    setLoginError("");
    setRole("admin");
    setView("employees");
  }

  // AUTOMATIC EMPLOYEE ACCOUNT CREATION
  function addEmployee(name, email, team) {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      alert("Please enter the employee name and email.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      alert("Please enter a valid email address.");
      return false;
    }

    const username = cleanEmail.split("@")[0];

    if (!username) {
      alert("The email must contain a username before @.");
      return false;
    }

    const duplicate = data.employees.some(
      (emp) =>
        emp.email?.toLowerCase() === cleanEmail ||
        emp.username?.toLowerCase() === username
    );

    if (duplicate) {
      alert("This email or username already exists.");
      return false;
    }

    // Generate employee ID from existing employee records.
    const employeeId =
      data.employees.reduce(
        (maxId, emp) => Math.max(maxId, Number(emp.id) || 0),
        0
      ) + 1;

    // Create the employee and login credentials automatically.
    const newEmployee = {
      id: employeeId,
      name: cleanName,
      email: cleanEmail,
      team,
      username,
      password: DEFAULT_PASSWORD,
    };

    setData((prev) => ({
      ...prev,
      employees: [...prev.employees, newEmployee],
    }));

    alert(
      `Employee created successfully!\n\n` +
        `Employee ID: ${employeeId}\n` +
        `Name: ${cleanName}\n` +
        `Username: ${username}\n` +
        `Password: ${DEFAULT_PASSWORD}\n` +
        `Team: ${team}`
    );

    return true;
  }

  // REMOVE EMPLOYEE
  function removeEmployee(id) {
    if (!window.confirm("Are you sure you want to remove this employee?")) {
      return;
    }

    setData((prev) => ({
      ...prev,
      employees: prev.employees.filter((emp) => emp.id !== id),
    }));
  }

  // CHANGE EMPLOYEE TEAM
  function changeEmployeeTeam(id, team) {
    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((emp) =>
        emp.id === id ? { ...emp, team } : emp
      ),
    }));
  }

  // ADD ANNOUNCEMENT
  function addAnnouncement(text, target) {
    if (!text.trim()) {
      alert("Please enter an announcement.");
      return false;
    }

    setData((prev) => ({
      ...prev,
      announcements: [
        {
          id: prev.nextId,
          text: text.trim(),
          target,
          date: todayLabel(),
        },
        ...prev.announcements,
      ],
      nextId: prev.nextId + 1,
    }));

    return true;
  }

  // REMOVE ANNOUNCEMENT
  function removeAnnouncement(id) {
    if (!window.confirm("Delete this announcement?")) return;

    setData((prev) => ({
      ...prev,
      announcements: prev.announcements.filter((a) => a.id !== id),
    }));
  }

  // SCHEDULE MEETING
  function addMeeting(title, team, date, time, link) {
    if (!title.trim() || !date) {
      alert("Please enter the meeting title and date.");
      return false;
    }

    const cleanLink = link.trim();

    if (cleanLink && !isSafeUrl(cleanLink)) {
      alert("Please enter a valid meeting link starting with http:// or https://");
      return false;
    }

    setData((prev) => ({
      ...prev,
      meetings: [
        ...prev.meetings,
        {
          id: prev.nextId,
          title: title.trim(),
          team,
          date,
          time,
          link: cleanLink,
        },
      ].sort((a, b) =>
        (a.date + (a.time || "")).localeCompare(
          b.date + (b.time || "")
        )
      ),
      nextId: prev.nextId + 1,
    }));

    return true;
  }

  // REMOVE MEETING
  function removeMeeting(id) {
    if (!window.confirm("Delete this meeting?")) return;

    setData((prev) => ({
      ...prev,
      meetings: prev.meetings.filter((m) => m.id !== id),
    }));
  }

  const currentEmp = data.employees.find(
    (emp) => emp.id === currentEmpId
  );

  // LOGIN SCREEN
  if (!loggedIn) {
    return (
      <div id="gate">
        <div className="gate-card">
          <h1>TeamHub</h1>

          <p className="lede">
            Employee records, announcements and meetings for the whole
            company, in one place.
          </p>

          <div className="role-row">
            <button
              type="button"
              className={`role-btn ${role === "admin" ? "active" : ""}`}
              onClick={() => {
                setRole("admin");
                setLoginError("");
              }}
            >
              <strong>Continue as Admin</strong>
              <span>
                Manage employees, teams, announcements and meetings.
              </span>
            </button>

            <button
              type="button"
              className={`role-btn ${role === "employee" ? "active" : ""}`}
              onClick={() => {
                setRole("employee");
                setLoginError("");
              }}
            >
              <strong>Continue as Employee</strong>
              <span>
                See your profile, team announcements and meetings.
              </span>
            </button>
          </div>

          <form onSubmit={attemptLogin}>
            {loginError && (
              <div
                role="alert"
                style={{
                  color: "var(--danger)",
                  fontSize: 13,
                  marginBottom: 10,
                }}
              >
                {loginError}
              </div>
            )}

            <div className="field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            <button className="go-btn" type="submit">
              Log in
            </button>
          </form>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div id="app">
      <div className="shell">
        <Sidebar
          role={role}
          view={view}
          setView={setView}
          currentEmp={currentEmp}
          logout={logout}
        />

        {/* key={view} replays the page animation on every tab change */}
        <div className="main" key={`${role}-${view}`}>
          {role === "admin" && view === "employees" && (
            <EmployeesView
              employees={data.employees}
              addEmployee={addEmployee}
              removeEmployee={removeEmployee}
              changeEmployeeTeam={changeEmployeeTeam}
            />
          )}

          {role === "admin" && view === "announcements" && (
            <AnnouncementsView
              announcements={data.announcements}
              addAnnouncement={addAnnouncement}
              removeAnnouncement={removeAnnouncement}
            />
          )}

          {role === "admin" && view === "meetings" && (
            <MeetingsView
              meetings={data.meetings}
              addMeeting={addMeeting}
              removeMeeting={removeMeeting}
            />
          )}

          {role === "employee" && view === "myprofile" && (
            <ProfileView emp={currentEmp} />
          )}

          {role === "employee" && view === "myfeed" && (
            <EmpFeedView
              announcements={data.announcements}
              emp={currentEmp}
            />
          )}

          {role === "employee" && view === "mymeetings" && (
            <EmpMeetingsView
              meetings={data.meetings}
              emp={currentEmp}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// SIDEBAR
function Sidebar({ role, view, setView, currentEmp, logout }) {
  const adminItems = [
    ["employees", "Employees"],
    ["announcements", "Announcements"],
    ["meetings", "Meetings"],
  ];

  const employeeItems = [
    ["myprofile", "My profile"],
    ["myfeed", "Announcements & messages"],
    ["mymeetings", "Meetings"],
  ];

  const items = role === "admin" ? adminItems : employeeItems;

  return (
    <div className="sidebar">
      <div className="brand">TeamHub</div>

      <div>
        {items.map(([key, label]) => (
          <div
            key={key}
            role="button"
            tabIndex={0}
            className={`navitem ${view === key ? "active" : ""}`}
            onClick={() => setView(key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setView(key);
              }
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <div className="whoami">
          {role === "admin"
            ? "Signed in as Admin"
            : currentEmp
              ? `${currentEmp.name} · ${currentEmp.team}`
              : ""}
        </div>

        <button type="button" className="logout" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}

// ADMIN EMPLOYEE MANAGEMENT
function EmployeesView({
  employees,
  addEmployee,
  removeEmployee,
  changeEmployeeTeam,
}) {
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const teamRef = useRef(null);

  function handleAddEmployee() {
    const success = addEmployee(
      nameRef.current.value,
      emailRef.current.value,
      teamRef.current.value
    );

    if (success) {
      nameRef.current.value = "";
      emailRef.current.value = "";
    }
  }

  return (
    <div className="view">
      <h2>Employees</h2>
      <p className="sub">
        Add, edit or remove staff and assign them to a team.
        Employee login accounts are created automatically.
      </p>

      <div className="card">
        <h3>Add an employee</h3>

        <div className="row-form">
          <div className="field">
            <label htmlFor="emp-name">Name</label>
            <input
              id="emp-name"
              ref={nameRef}
              placeholder="Full name"
            />
          </div>

          <div className="field">
            <label htmlFor="emp-email">Email</label>
            <input
              id="emp-email"
              ref={emailRef}
              type="email"
              placeholder="name@company.com"
            />
          </div>

          <div className="field">
            <label htmlFor="emp-team">Team</label>
            <select id="emp-team" ref={teamRef}>
              {TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn"
            onClick={handleAddEmployee}
          >
            Add employee
          </button>
        </div>

        <p className="sub" style={{ margin: "14px 0 0" }}>
          Default employee password: {DEFAULT_PASSWORD}
        </p>
      </div>

      <div className="card">
        <h3>All employees ({employees.length})</h3>

        {employees.length === 0 ? (
          <div className="empty">No employees yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Team</th>
                  <th>Login username</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.id}</td>
                    <td>{emp.name}</td>
                    <td>{emp.email || "—"}</td>

                    <td>
                      <select
                        aria-label={`Team for ${emp.name}`}
                        value={emp.team}
                        onChange={(e) =>
                          changeEmployeeTeam(emp.id, e.target.value)
                        }
                      >
                        {TEAMS.map((team) => (
                          <option key={team} value={team}>
                            {team}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>{emp.username || "—"}</td>

                    <td>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => removeEmployee(emp.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ADMIN ANNOUNCEMENTS
function AnnouncementsView({
  announcements,
  addAnnouncement,
  removeAnnouncement,
}) {
  const textRef = useRef(null);
  const targetRef = useRef(null);

  return (
    <div className="view">
      <h2>Announcements</h2>

      <p className="sub">
        Send a message to the whole company or to one team.
      </p>

      <div className="card">
        <h3>New announcement</h3>

        <div className="field">
          <label htmlFor="ann-text">Message</label>
          <textarea
            id="ann-text"
            ref={textRef}
            rows={3}
            placeholder="What do people need to know?"
          />
        </div>

        <div className="row-form">
          <div className="field">
            <label htmlFor="ann-target">Send to</label>
            <select id="ann-target" ref={targetRef}>
              <option value="all">Whole company</option>

              {TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => {
              const success = addAnnouncement(
                textRef.current.value,
                targetRef.current.value
              );

              if (success) {
                textRef.current.value = "";
              }
            }}
          >
            Send announcement
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Sent announcements</h3>
        <Feed items={announcements} onRemove={removeAnnouncement} />
      </div>
    </div>
  );
}

// ADMIN MEETINGS
function MeetingsView({ meetings, addMeeting, removeMeeting }) {
  const titleRef = useRef(null);
  const teamRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);
  const linkRef = useRef(null);

  return (
    <div className="view">
      <h2>Meetings</h2>

      <p className="sub">
        Schedule meetings for the company or a specific team.
      </p>

      <div className="card">
        <h3>New meeting</h3>

        <div className="row-form" style={{ marginBottom: 12 }}>
          <div className="field">
            <label htmlFor="mt-title">Title</label>
            <input
              id="mt-title"
              ref={titleRef}
              placeholder="e.g. Sprint review"
            />
          </div>

          <div className="field">
            <label htmlFor="mt-team">Team</label>
            <select id="mt-team" ref={teamRef}>
              <option value="all">Whole company</option>

              {TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row-form" style={{ marginBottom: 12 }}>
          <div className="field">
            <label htmlFor="mt-date">Date</label>
            <input id="mt-date" type="date" ref={dateRef} />
          </div>

          <div className="field">
            <label htmlFor="mt-time">Time</label>
            <input id="mt-time" type="time" ref={timeRef} />
          </div>

          <div className="field">
            <label htmlFor="mt-link">Teams meeting link</label>
            <input
              id="mt-link"
              ref={linkRef}
              type="url"
              placeholder="https://teams.microsoft.com/..."
            />
          </div>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => {
            const success = addMeeting(
              titleRef.current.value,
              teamRef.current.value,
              dateRef.current.value,
              timeRef.current.value,
              linkRef.current.value
            );

            if (success) {
              titleRef.current.value = "";
              dateRef.current.value = "";
              timeRef.current.value = "";
              linkRef.current.value = "";
            }
          }}
        >
          Schedule meeting
        </button>
      </div>

      <div className="card">
        <h3>Scheduled meetings</h3>
        <Feed items={meetings} isMeeting onRemove={removeMeeting} />
      </div>
    </div>
  );
}

// ANNOUNCEMENT AND MEETING FEED
function Feed({ items, isMeeting = false, onRemove }) {
  if (!items.length) {
    return (
      <div className="empty">
        {isMeeting ? "No meetings scheduled." : "Nothing sent yet."}
      </div>
    );
  }

  return items.map((item) => {
    const tag = isMeeting ? item.team : item.target;

    return (
      <div className="feed-item" key={item.id}>
        <div className="meta">
          <span className={`pill ${tag === "all" ? "" : "amber"}`}>
            {tag === "all" ? "Whole company" : tag}
          </span>

          {" · "}

          {isMeeting
            ? formatDate(item.date) +
              (item.time ? ` · ${item.time}` : "")
            : item.date}
        </div>

        <p>{isMeeting ? item.title : item.text}</p>

        {isMeeting && item.link && isSafeUrl(item.link) && (
          <a
            className="join-link"
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join meeting
          </a>
        )}

        {onRemove && (
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              className="icon-btn"
              onClick={() => onRemove(item.id)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  });
}

// EMPLOYEE PROFILE
function ProfileView({ emp }) {
  if (!emp) {
    return (
      <div className="view">
        <div className="empty">Profile not found.</div>
      </div>
    );
  }

  return (
    <div className="view">
      <h2>My profile</h2>

      <p className="sub">Your personal details and assigned team.</p>

      <div className="card">
        <div className="profile-grid">
          <div>
            <span>Employee ID</span>
            {emp.id}
          </div>

          <div>
            <span>Name</span>
            {emp.name}
          </div>

          <div>
            <span>Email</span>
            {emp.email || "—"}
          </div>

          <div>
            <span>Username</span>
            {emp.username}
          </div>

          <div>
            <span>Team</span>
            {emp.team}
          </div>

          <div>
            <span>Role</span>
            Employee
          </div>
        </div>
      </div>
    </div>
  );
}

// EMPLOYEE ANNOUNCEMENTS
function EmpFeedView({ announcements, emp }) {
  if (!emp) {
    return (
      <div className="view">
        <div className="empty">Employee not found.</div>
      </div>
    );
  }

  const relevant = announcements.filter(
    (announcement) =>
      announcement.target === "all" || announcement.target === emp.team
  );

  return (
    <div className="view">
      <h2>Announcements &amp; team messages</h2>

      <p className="sub">
        Company-wide updates and messages for {emp.team}.
      </p>

      <div className="card">
        <Feed items={relevant} />
      </div>
    </div>
  );
}

// EMPLOYEE MEETINGS
function EmpMeetingsView({ meetings, emp }) {
  if (!emp) {
    return (
      <div className="view">
        <div className="empty">Employee not found.</div>
      </div>
    );
  }

  const relevant = meetings.filter(
    (meeting) => meeting.team === "all" || meeting.team === emp.team
  );

  return (
    <div className="view">
      <h2>My meetings</h2>

      <p className="sub">
        Company meetings and meetings for {emp.team}.
      </p>

      <div className="card">
        <Feed items={relevant} isMeeting />
      </div>
    </div>
  );
}