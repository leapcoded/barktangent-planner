import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    deleteDoc,
    updateDoc,
    onSnapshot,
    query,
    setDoc,
    setLogLevel,
    orderBy,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';

// --- Firebase Configuration ---
// IMPORTANT: This is a placeholder. You MUST replace this with your own
// Firebase project configuration for the app to work when deployed.
const firebaseConfig = {
  apiKey: "AIzaSyDAHz4WlysnKsO3oZaZeI0LXHtHAs5stC0",
  authDomain: "barkplanner.firebaseapp.com",
  projectId: "barkplanner",
  storageBucket: "barkplanner.firebasestorage.app",
  messagingSenderId: "105053819446",
  appId: "1:105053819446:web:f096132d8b4a52a8347e97",
  measurementId: "G-KRQRVW2LSJ"
};


// --- Helper Functions ---
const getAppId = () => {
    // For local development, we'll use a static ID.
    return 'barktangent-2026-planner';
};

// --- Static Data ---
const lineupData = {
    wednesday: [
        { band: "Sans Froid", time: "13:00 - 13:30", stage: "Yohkai" },
        { band: "Thank", time: "13:35 - 14:05", stage: "PX3" },
        { band: "Hundred Year Old Man", time: "14:10 - 14:40", stage: "Yohkai" },
        { band: "God Alone", time: "14:45 - 15:20", stage: "PX3" },
        { band: "Healthyliving", time: "15:25 - 16:00", stage: "Yohkai" },
        { band: "Underdark", time: "16:05 - 16:40", stage: "PX3" },
        { band: "Year of No Light", time: "16:45 - 17:30", stage: "Yohkai" },
        { band: "Colossal Squid", time: "17:35 - 18:15", stage: "PX3" },
        { band: "Kalandra", time: "18:20 - 19:05", stage: "Yohkai" },
        { band: "Teeth Of The Sea", time: "19:10 - 19:55", stage: "PX3" },
        { band: "SLIFT", time: "20:00 - 21:00", stage: "Yohkai" },
        { band: "Wardruna", time: "21:15 - 23:00", stage: "Main" },
        { band: "AK/DK (Live Silent Disco Set)", time: "23:15 - 00:24", stage: "Yohkai" },
        { band: "Silent Disco DJs", time: "00:25 - 02:00", stage: "Yohkai" },
    ],
    thursday: [
        { band: "Codespeaker", time: "11:00 - 11:30", stage: "PX3" },
        { band: "Lost in Kiev", time: "11:00 - 11:30", stage: "Main" },
        { band: "The Grey", time: "11:35 - 12:05", stage: "Yohkai" },
        { band: "The Sad Season", time: "11:35 - 12:05", stage: "Bixler" },
        { band: "Lemondaze", time: "12:10 - 12:40", stage: "PX3" },
        { band: "Dronte", time: "12:10 - 12:40", stage: "Main" },
        { band: "Maud the Moth", time: "12:45 - 13:15", stage: "Bixler" },
        { band: "Ni", time: "12:45 - 13:15", stage: "Yohkai" },
        { band: "As Living Arrows", time: "13:20 - 13:50", stage: "PX3" },
        { band: "REZN", time: "13:20 - 13:50", stage: "Main" },
        { band: "Horrendous", time: "13:55 - 14:25", stage: "Bixler" },
        { band: "Pothamus", time: "13:55 - 14:25", stage: "Yohkai" },
        { band: "The Gorge", time: "14:30 - 15:10", stage: "PX3" },
        { band: "We Lost The Sea", time: "14:30 - 15:10", stage: "Main" },
        { band: "Lowen", time: "15:15 - 15:55", stage: "Yohkai" },
        { band: "Snooze", time: "15:15 - 15:55", stage: "Bixler" },
        { band: "Meryl Streek", time: "16:00 - 16:40", stage: "PX3" },
        { band: "The Fall of Troy", time: "16:00 - 16:45", stage: "Main" },
        { band: "Vianova", time: "16:45 - 17:25", stage: "Bixler" },
        { band: "Pelican", time: "16:50 - 17:35", stage: "Yohkai" },
        { band: "Street grease", time: "17:40 - 18:25", stage: "PX3" },
        { band: "Melvins", time: "17:40 - 18:30", stage: "Main" },
        { band: "Tangled Hair", time: "18:35 - 19:25", stage: "Bixler" },
        { band: "Kylesa", time: "18:35 - 19:25", stage: "Yohkai" },
        { band: "Tayne", time: "19:30 - 20:15", stage: "PX3" },
        { band: "Leprous", time: "19:30 - 20:20", stage: "Main" },
        { band: "SUNGZER", time: "20:25 - 21:15", stage: "Bixler" },
        { band: "Arab Strap", time: "20:25 - 21:15", stage: "Yohkai" },
        { band: "Battlesnake", time: "21:20 - 22:10", stage: "PX3" },
        { band: "Godspeed You! Black Emperor", time: "21:20 - 23:00", stage: "Main" },
        { band: "YARD (Live Silent Disco Set)", time: "23:15 - 23:59", stage: "Yohkai" },
        { band: "Silent Disco DJs", time: "00:00 - 03:00", stage: "Yohkai" },
    ]
};


// --- Main App Component ---
export default function App() {
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            // Use the hardcoded firebaseConfig object
            const app = initializeApp(firebaseConfig);
            setLogLevel('debug');
            setDb(getFirestore(app));
            const auth = getAuth(app);
            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                } else {
                    // For local deployment, we'll just sign in anonymously.
                    try {
                       await signInAnonymously(auth);
                    } catch (authError) {
                        setError("Connection failed. Have you enabled Anonymous Sign-In in your Firebase project's Authentication settings?");
                    }
                }
                setIsAuthReady(true);
            });
            return unsubscribe;
        } catch (e) {
            setError("Failed to initialize the application. Did you replace the placeholder Firebase config?");
            console.error(e);
        }
    }, []);

    return (
        <>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap'); body { font-family: 'Roboto Mono', monospace; }`}</style>
            <div className="bg-slate-900 text-slate-200 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
                {error && <div className="text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</div>}
                {!isAuthReady && !error && <div className="text-center text-slate-400">Connecting to the Grid...</div>}
                {isAuthReady && user && db && <BarktanentPlanner db={db} currentUser={user} />}
            </div>
        </>
    );
}

// --- Barktangent Planner Component ---
function BarktanentPlanner({ db, currentUser }) {
    const appId = getAppId();
    const [users, setUsers] = useState(null); // Start as null to indicate loading
    const [groups, setGroups] = useState([]);
    const [supplies, setSupplies] = useState([]);
    const [requests, setRequests] = useState([]);
    const [messages, setMessages] = useState([]);
    const [lineupChoices, setLineupChoices] = useState({});
    const [activeView, setActiveView] = useState('planner'); // 'planner' or 'lineup'
    
    const collections = {
        users: `artifacts/${appId}/public/data/users`,
        groups: `artifacts/${appId}/public/data/groups`,
        supplies: `artifacts/${appId}/public/data/supplies`,
        requests: `artifacts/${appId}/public/data/requests`,
        chat: `artifacts/${appId}/public/data/chat`,
        lineup: `artifacts/${appId}/public/data/lineupChoices`
    };

    // --- Data Fetching ---
    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, collections.users)), snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsubscribe;
    }, [db, collections.users]);
    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, collections.groups)), snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsubscribe;
    }, [db, collections.groups]);
    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, collections.supplies)), snap => setSupplies(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsubscribe;
    }, [db, collections.supplies]);
    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, collections.requests)), snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsubscribe;
    }, [db, collections.requests]);
    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, collections.chat), orderBy("createdAt")), snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsubscribe;
    }, [db, collections.chat]);
    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, collections.lineup)), snap => {
            const choices = {};
            snap.forEach(doc => {
                choices[doc.id] = doc.data().attendees;
            });
            setLineupChoices(choices);
        });
        return unsubscribe;
    }, [db, collections.lineup]);

    // Ensure user document exists
    useEffect(() => {
        if (currentUser?.uid) {
            const userDocRef = doc(db, collections.users, currentUser.uid);
            setDoc(userDocRef, { id: currentUser.uid }, { merge: true });
        }
    }, [currentUser, db, collections.users]);

    // Loading state based on essential data
    if (users === null) {
        return <div className="text-center text-slate-400">Loading Planner Data...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <Header userId={currentUser.uid} />
            
            <div className="my-6">
                <UserManagement db={db} collections={collections} currentUser={currentUser} currentUserData={users.find(u => u.id === currentUser.uid)} allUsers={users} allGroups={groups} />
            </div>

            <div className="flex border-b border-slate-700 mb-6">
                <TabButton name="Planner" active={activeView === 'planner'} onClick={() => setActiveView('planner')} />
                <TabButton name="Lineup" active={activeView === 'lineup'} onClick={() => setActiveView('lineup')} />
            </div>

            {activeView === 'planner' && (
                <PlannerView 
                    db={db}
                    collections={collections}
                    currentUser={currentUser}
                    currentUserData={users.find(u => u.id === currentUser.uid)}
                    users={users}
                    groups={groups}
                    supplies={supplies}
                    requests={requests}
                    messages={messages}
                />
            )}

            {activeView === 'lineup' && (
                <LineupView 
                    db={db}
                    collectionPath={collections.lineup}
                    lineupChoices={lineupChoices}
                    currentUser={currentUser}
                    allUsers={users}
                />
            )}
        </div>
    );
}

// --- Main Views ---
const PlannerView = ({ db, collections, currentUser, currentUserData, users, groups, supplies, requests, messages }) => {
    const [activeGroupId, setActiveGroupId] = useState(null);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

    useEffect(() => {
        if (!activeGroupId && groups.length > 0) {
            setActiveGroupId(groups[0].id);
        }
    }, [groups, activeGroupId]);

    const activeGroup = groups.find(g => g.id === activeGroupId);
    const groupMemberIds = users.filter(u => u.campingGroupId === activeGroupId).map(m => m.id);
    const groupSupplies = supplies.filter(s => groupMemberIds.includes(s.authorId));

    const handleCreateGroup = async (groupName) => {
        if (!groupName.trim()) return;
        const newGroupRef = await addDoc(collection(db, collections.groups), { name: groupName, createdBy: currentUser.uid });
        setActiveGroupId(newGroupRef.id);
        setShowCreateGroupModal(false);
    };

    return (
        <div className="lg:flex lg:gap-8">
            <div className="lg:w-2/3 space-y-8">
                <Section title="Camping Groups">
                    <div className="flex items-center border-b border-slate-700 mb-6 flex-wrap">
                        {groups.map(group => (
                            <button key={group.id} onClick={() => setActiveGroupId(group.id)} className={`py-2 px-4 text-sm font-semibold transition-colors ${activeGroupId === group.id ? 'border-b-2 border-teal-400 text-teal-300' : 'text-slate-400 hover:text-white'}`}>
                                {group.name}
                            </button>
                        ))}
                        <button onClick={() => setShowCreateGroupModal(true)} className="ml-auto py-1 px-3 text-sm bg-teal-500 hover:bg-teal-600 rounded-md font-bold">+</button>
                    </div>
                    {activeGroup ? (
                        <SupplyList db={db} collectionPath={collections.supplies} supplies={groupSupplies} currentUser={currentUser} currentUserData={currentUserData} />
                    ) : (
                        <div className="text-center py-10 text-slate-400">
                            <p>Select a group to see their supplies, or create a new one.</p>
                        </div>
                    )}
                </Section>
                 <RequestList db={db} collectionPath={collections.requests} allRequests={requests} currentUser={currentUser} currentUserData={currentUserData} activeGroupId={activeGroupId} />
            </div>
            <div className="lg:w-1/3 mt-8 lg:mt-0">
                 <div className="lg:sticky lg:top-8">
                    <ChatContainer db={db} collectionPath={collections.chat} allMessages={messages} currentUser={currentUser} currentUserData={currentUserData} activeGroupId={activeGroupId} />
                 </div>
            </div>
            {showCreateGroupModal && <CreateGroupModal onCreate={handleCreateGroup} onClose={() => setShowCreateGroupModal(false)} />}
        </div>
    );
};

const LineupView = ({ db, collectionPath, lineupChoices, currentUser, allUsers }) => {
    const [activeDay, setActiveDay] = useState('wednesday');

    const handleToggleChoice = async (bandName, day) => {
        const docId = `${day}_${bandName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const docRef = doc(db, collectionPath, docId);
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);
            const attendees = docSnap.exists() ? docSnap.data().attendees || [] : [];
            const newAttendees = attendees.includes(currentUser.uid)
                ? attendees.filter(uid => uid !== currentUser.uid)
                : [...attendees, currentUser.uid];
            transaction.set(docRef, { attendees: newAttendees });
        });
    };

    return (
        <Section title="Lineup">
            <div className="flex border-b border-slate-700 mb-4">
                <TabButton name="Wednesday" active={activeDay === 'wednesday'} onClick={() => setActiveDay('wednesday')} />
                <TabButton name="Thursday" active={activeDay === 'thursday'} onClick={() => setActiveDay('thursday')} />
            </div>
            <div className="space-y-3">
                {lineupData[activeDay].map(item => {
                    const docId = `${activeDay}_${item.band.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    const attendees = lineupChoices[docId] || [];
                    const isAttending = attendees.includes(currentUser.uid);
                    const attendeeNames = attendees.map(uid => {
                        const user = allUsers.find(u => u.id === uid);
                        return user ? user.name : null;
                    }).filter(Boolean).join(', ');

                    return (
                        <div key={docId} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-orange-400">{item.band}</h3>
                                <p className="text-sm text-slate-400">{item.time} @ {item.stage}</p>
                                {attendeeNames && <p className="text-xs text-teal-400 mt-1">Going: {attendeeNames}</p>}
                            </div>
                            <button onClick={() => handleToggleChoice(item.band, activeDay)} className={`text-3xl w-14 h-14 flex items-center justify-center rounded-full transition-colors duration-200 ${isAttending ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-500 hover:bg-slate-600'}`}>
                                {isAttending ? '😻' : '🐾'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </Section>
    );
};


// --- Modals and Reusable Components ---
const CreateGroupModal = ({ onCreate, onClose }) => {
    const [name, setName] = useState('');
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-sm border border-slate-700">
                <h2 className="text-xl font-bold mb-4">Create New Camping Group</h2>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., The Sussy Barkers" className="w-full bg-slate-700 p-2 rounded-md mb-4 focus:ring-2 focus:ring-teal-400 outline-none" />
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={() => onCreate(name)} className="bg-teal-500 hover:bg-teal-600 px-4 py-2 rounded-md font-semibold">Create</button>
                </div>
            </div>
        </div>
    );
};

const Header = ({ userId }) => (
    <header className="text-center mb-6 p-4 border-b-2 border-orange-500/50">
        <h1 className="text-4xl sm:text-5xl font-bold text-orange-400 tracking-wider">BARKTANGENT 2026</h1>
        <p className="text-slate-400 mt-2">Group Planner</p>
        <p className="text-xs text-slate-500 mt-4">Your ID: {userId}</p>
    </header>
);

const UserManagement = ({ db, collections, currentUser, currentUserData, allUsers, allGroups }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    useEffect(() => {
        setEditData(currentUserData || {});
    }, [currentUserData, isEditing]);

    const handleSave = async () => {
        await setDoc(doc(db, collections.users, currentUser.uid), editData, { merge: true });
        setIsEditing(false);
    };

    const handleTravelWithToggle = (userId) => {
        const currentTravelMates = editData.travellingWith || [];
        const newTravelMates = currentTravelMates.includes(userId)
            ? currentTravelMates.filter(id => id !== userId)
            : [...currentTravelMates, userId];
        setEditData({...editData, travellingWith: newTravelMates});
    };
    
    const travellingWithNames = (currentUserData?.travellingWith || [])
        .map(uid => allUsers.find(u => u.id === uid)?.name)
        .filter(Boolean)
        .join(', ');

    return (
        <Section title="Your Info">
            {isEditing ? (
                <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Your Name" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="bg-slate-700 p-2 rounded-md focus:ring-2 focus:ring-teal-400 outline-none" />
                        <select value={editData.campingGroupId || ''} onChange={e => setEditData({...editData, campingGroupId: e.target.value})} className="bg-slate-700 p-2 rounded-md focus:ring-2 focus:ring-teal-400 outline-none">
                            <option value="">-- Join a Camping Group --</option>
                            {allGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <h4 className="font-bold mb-2">Travelling With:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {allUsers.filter(u => u.id !== currentUser.uid && u.name).map(user => (
                                <label key={user.id} className="flex items-center gap-2 bg-slate-700 p-2 rounded-md">
                                    <input type="checkbox" checked={(editData.travellingWith || []).includes(user.id)} onChange={() => handleTravelWithToggle(user.id)} className="form-checkbox bg-slate-800 text-teal-400 focus:ring-teal-500"/>
                                    {user.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={handleSave} className="bg-teal-500 hover:bg-teal-600 px-4 py-2 rounded-md font-semibold">Save</button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between p-4">
                    <div>
                        <p><span className="font-bold text-slate-400">Name:</span> {currentUserData?.name || 'Not set'}</p>
                        <p><span className="font-bold text-slate-400">Camping Group:</span> {allGroups.find(g => g.id === currentUserData?.campingGroupId)?.name || 'None'}</p>
                        <p><span className="font-bold text-slate-400">Travelling With:</span> {travellingWithNames || 'Solo'}</p>
                    </div>
                    <button onClick={() => setIsEditing(true)} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-md font-semibold">Edit My Info</button>
                </div>
            )}
        </Section>
    );
};

const SupplyList = ({ db, collectionPath, supplies, currentUser, currentUserData }) => {
    const handleAdd = async (text) => {
        if (!text.trim() || !currentUserData?.name) return;
        await addDoc(collection(db, collectionPath), { itemName: text, broughtBy: currentUserData.name, authorId: currentUser.uid });
    };
    const handleDelete = async (id) => await deleteDoc(doc(db, collectionPath, id));

    return (
        <div className="h-full flex flex-col">
            <AddItemForm onAdd={handleAdd} placeholder="e.g., Tent, Gazebo..." />
            <ul className="space-y-2 mt-4 flex-grow overflow-y-auto p-2 bg-slate-900/50 rounded-md min-h-[20rem]">
                {supplies.map(item => (
                    <li key={item.id} className="flex justify-between items-center bg-slate-800 p-2 rounded-md">
                        <span><span className="text-orange-400 font-bold">{item.broughtBy}:</span> {item.itemName}</span>
                        {item.authorId === currentUser.uid && <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 font-bold">X</button>}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const RequestList = ({ db, collectionPath, allRequests, currentUser, currentUserData, activeGroupId }) => {
    const [viewScope, setViewScope] = useState('global');
    const [postGlobally, setPostGlobally] = useState(true);

    useEffect(() => {
        if (!activeGroupId) {
            setViewScope('global');
        }
    }, [activeGroupId]);

    const handleAdd = async (text) => {
        if (!text.trim() || !currentUserData?.name) return;
        
        const requestData = {
            itemName: text,
            requestedBy: currentUserData.name,
            status: 'Needed',
            authorId: currentUser.uid,
            groupId: null,
            isGlobal: false,
        };

        if (viewScope === 'group' && activeGroupId) {
            requestData.groupId = activeGroupId;
            requestData.isGlobal = postGlobally;
        } else {
            requestData.isGlobal = true;
        }

        await addDoc(collection(db, collectionPath), requestData);
    };

    const handleDelete = async (id) => await deleteDoc(doc(db, collectionPath, id));
    const handleFulfill = async (id) => {
        if (!currentUserData?.name) return;
        await updateDoc(doc(db, collectionPath, id), { status: 'Fulfilled', fulfilledBy: currentUserData.name });
    };
    
    const filteredRequests = allRequests.filter(r => {
        if (viewScope === 'global') return r.isGlobal;
        return r.groupId === activeGroupId;
    });

    return (
        <Section title="Requests">
            <div className="flex border-b border-slate-700 mb-2">
                <TabButton name="Group" active={viewScope === 'group'} onClick={() => setViewScope('group')} disabled={!activeGroupId} />
                <TabButton name="Barktangent" active={viewScope === 'global'} onClick={() => setViewScope('global')} />
            </div>
            <AddItemForm onAdd={handleAdd} placeholder="e.g., Mallet..." withGlobalToggle={viewScope === 'group'} postGlobally={postGlobally} setPostGlobally={setPostGlobally} />
            <ul className="space-y-2 mt-4 flex-grow overflow-y-auto p-2 bg-slate-900/50 rounded-md min-h-[10rem]">
                {filteredRequests.map(item => (
                    <li key={item.id} className={`p-2 rounded-md ${item.status === 'Fulfilled' ? 'bg-green-800/50' : 'bg-slate-800'}`}>
                        <div className="flex justify-between items-center">
                            <span>{item.itemName} <span className="text-xs text-slate-400">(req. by {item.requestedBy})</span></span>
                            {item.authorId === currentUser.uid && <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 font-bold">X</button>}
                        </div>
                        {item.status === 'Needed' ? <button onClick={() => handleFulfill(item.id)} className="text-sm bg-teal-500 hover:bg-teal-600 w-full py-1 mt-1 rounded font-semibold">I'll bring this!</button> : <p className="text-sm text-teal-300 mt-1">Brought by {item.fulfilledBy}</p>}
                    </li>
                ))}
            </ul>
        </Section>
    );
};

const ChatContainer = ({ db, collectionPath, allMessages, currentUser, currentUserData, activeGroupId }) => {
    const [activeChat, setActiveChat] = useState('global');
    
    useEffect(() => {
        if (!activeGroupId) {
            setActiveChat('global');
        }
    }, [activeGroupId]);

    const groupMessages = allMessages.filter(m => m.groupId === activeGroupId);
    const globalMessages = allMessages.filter(m => m.groupId === 'global');

    return (
        <Section title="Chat" className="h-full flex flex-col">
             <div className="flex border-b border-slate-700 mb-2">
                <TabButton name="Group" active={activeChat === 'group'} onClick={() => setActiveChat('group')} disabled={!activeGroupId} />
                <TabButton name="Barktangent" active={activeChat === 'global'} onClick={() => setActiveChat('global')} />
            </div>
            <ChatBox
                db={db}
                collectionPath={collectionPath}
                messages={activeChat === 'group' ? groupMessages : globalMessages}
                currentUser={currentUser}
                currentUserData={currentUserData}
                groupId={activeChat === 'group' ? activeGroupId : 'global'}
            />
        </Section>
    );
};

const ChatBox = ({ db, collectionPath, messages, currentUser, currentUserData, groupId }) => {
    const [newMessage, setNewMessage] = useState('');
    const chatContainerRef = useRef(null);

    useEffect(() => {
        if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserData?.name || !groupId) return;
        await addDoc(collection(db, collectionPath), { text: newMessage, authorName: currentUserData.name, authorId: currentUser.uid, groupId, createdAt: serverTimestamp() });
        setNewMessage('');
    };

    return (
        <div className="flex flex-col flex-grow h-full">
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-2 space-y-3 bg-slate-900/50 rounded-md">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.authorId === currentUser.uid ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded-lg px-3 py-2 max-w-xs ${msg.authorId === currentUser.uid ? 'bg-teal-600' : 'bg-slate-700'}`}>
                            <p className="text-xs text-orange-300 font-bold">{msg.authorName}</p>
                            <p className="text-sm break-words">{msg.text}</p>
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2 mt-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Say something..." className="flex-grow bg-slate-700 p-2 rounded-md focus:ring-2 focus:ring-teal-400 outline-none" />
                <button type="submit" className="bg-teal-500 hover:bg-teal-600 px-4 rounded-md font-semibold" disabled={!newMessage.trim()}>Send</button>
            </form>
        </div>
    );
};

const Section = ({ title, children, className = '' }) => (
    <div className={`bg-slate-800/50 p-4 rounded-lg shadow-lg border border-slate-700 ${className}`}><h2 className="text-2xl font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">{title}</h2>{children}</div>
);

const AddItemForm = ({ onAdd, placeholder, withGlobalToggle, postGlobally, setPostGlobally }) => {
    const [text, setText] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text);
        setText('');
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex gap-2">
                <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} className="flex-grow bg-slate-700 p-2 rounded-md focus:ring-2 focus:ring-teal-400 outline-none" />
                <button type="submit" className="bg-teal-500 hover:bg-teal-600 px-4 rounded-md font-semibold" disabled={!text.trim()}>Add</button>
            </div>
            {withGlobalToggle && (
                 <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input type="checkbox" checked={postGlobally} onChange={e => setPostGlobally(e.target.checked)} className="form-checkbox bg-slate-800 text-teal-400 focus:ring-teal-500"/>
                    Post to Barktangent
                </label>
            )}
        </form>
    );
};

const TabButton = ({ name, active, onClick, disabled }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`py-2 px-4 text-lg font-semibold transition-colors ${active ? 'border-b-2 border-teal-400 text-teal-300' : 'text-slate-400'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-white'}`}
    >
        {name}
    </button>
);
