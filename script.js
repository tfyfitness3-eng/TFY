// ============================
// TFY V2 FIREBASE IMPORTS
// ============================

import { auth, db, storage } from "./firebase.js";


import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

import {
    setPersistence,
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const MAX_VIDEO_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_DURATION = 30;

setPersistence(
    auth,
    browserLocalPersistence
)
.then(() => {

    console.log("TFY LOGIN PERSISTENCE ENABLED");

})
.catch((error) => {

    console.error(
        "Persistence error:",
        error
    );

});


window.tfyLogout = async function(){

    try{

        await signOut(auth);

        console.log("TFY logged out.");

    }catch(error){

        console.error("Logout error:", error);

    }

};



    import {
doc,
setDoc,
getDoc,
updateDoc,
deleteDoc,
increment,
arrayUnion,
arrayRemove,
addDoc,
collection,
query,
where,
getDocs,
orderBy,
limit,
serverTimestamp,
onSnapshot
}
from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";




// ============================
// GLOBAL PLAYER DATA
// ============================


let currentUser = null;



let player = {

    username:"Guest",
    bio:"",

    xp:0,
    totalXP:0,
    level:1,

    streak:0,

    lastWorkout:null,

    totalWorkouts:0,

    followers:0,
    following:0,

    achievements:[],

        workoutPlan:null,

    workoutProgress:{},

    workoutHistory:[],

    // WORKOUT PREFERENCES
    workoutPreferences:{
        age:null,
        goal:"",
        daysPerWeek:3,
        workoutTime:30,
        equipment:[],
        location:"",
        experience:"",
        limitations:"",
        style:""
    }

};

// ============================
// DAILY CHALLENGES
// ============================


const challenges = [


{

name:"Push Power",

workouts:[

["Push Ups",25],

["Dips",10],

["Sit Ups",30]

]

},


{

name:"Warrior Day",

workouts:[

["Squats",50],

["Push Ups",30],

["Plank",60]

]

},


{

name:"Strength Test",

workouts:[

["Push Ups",40],

["Lunges",40],

["Sit Ups",40]

]

},


{

name:"Discipline Day",

workouts:[

["Push Ups",20],

["Squats",50],

["Plank",90]

]

}


];




// ============================
// START APP
// ============================

 onAuthStateChanged(auth, async (user) => {

    if(user){

        currentUser = user;

        console.log("CURRENT USER UID:", user.uid);
        console.log("CURRENT USER EMAIL:", user.email);

        // ============================
        // ADMIN CHECK
        // ============================

        const adminButton =
            document.getElementById("adminButton");

        if(adminButton){

            const tokenResult =
                await user.getIdTokenResult(true);

            console.log(
                "TFY ADMIN CLAIM:",
                tokenResult.claims.admin
            );

            if(tokenResult.claims.admin === true){

                adminButton.style.display = "block";

                console.log(
                    "TFY ADMIN ACCESS ENABLED"
                );

            }
            else{

                adminButton.style.display = "none";

                console.log(
                    "TFY ADMIN ACCESS NOT FOUND"
                );

            }

        }

        loadProfile();

        setupAdmin();

    }
    else{

        currentUser = null;

    }

    loadLeaderboard();

    loadFeed();

    hideLoading();

    loadProfilePosts();

    loadNotifications();

    loadOwnFollowCounts();

    loadProfilePosts();

});








// ============================
// AUTH
// ============================

async function usernameTaken(username){

const q = query(
collection(db,"users"),
where("username","==",username)
);


const snapshot = await getDocs(q);


return !snapshot.empty;

}

async function signup(){


const username =
document.getElementById("signupName").value;


const email =
document.getElementById("signupEmail").value;


const password =
document.getElementById("signupPassword").value;


const taken = await usernameTaken(username);


if(taken){

alert("Username already taken ");

return;

}


try{


const result =
await createUserWithEmailAndPassword(

auth,

email,

password

);



currentUser = result.user;

await updateProfile(currentUser, {
    displayName: username
});

player.username = username;

await saveProfile();



closeAuth();



alert("Welcome to TFY ");



}

catch(error){


alert(error.message);


}


}





async function login(){


const email =
document.getElementById("signupEmail").value;



const password =
document.getElementById("signupPassword").value;



try{


await signInWithEmailAndPassword(

auth,

email,

password

);



closeAuth();



}

catch(error){


alert(error.message);


}



}





function logout(){


signOut(auth);


}







function closeAuth(){


const popup=document.getElementById("authPopup");


if(popup)

popup.style.display="none";


}







// ============================
// PROFILE LOADING
// ============================


  function loadProfile(){

    if(!currentUser) return;

    const ref = doc(
        db,
        "users",
        currentUser.uid
    );

    onSnapshot(ref,(snap)=>{

        if(snap.exists()){

            const data = snap.data();
            console.log("LOADED WORKOUT PLAN:", data.workoutPlan);

            player = {
                ...player,
                ...data,

                workoutPreferences:{
                    ...player.workoutPreferences,
                    ...(data.workoutPreferences || {})
                }
            };

        updateUI();

if(player.workoutPlan){

    window.displayTodaysWorkout();
    window.displayWeeklyWorkoutSchedule();

}

        }

        else{

            updateUI();

        }

    });

}


async function recoverProfile(userID){

    const postsQuery = query(
        collection(db, "posts"),
        where("userID", "==", userID),
        limit(1)
    );

    const postsSnapshot = await getDocs(postsQuery);

    let recoveredUsername = "Guest";

    postsSnapshot.forEach((post)=>{
        const data = post.data();

        if(data.username){
            recoveredUsername = data.username;
        }
    });

    player.username = recoveredUsername;

    await setDoc(
        doc(db, "users", userID),
        {
            username: recoveredUsername,
            bio: player.bio || "",
            xp: player.xp || 0,
            totalXP: player.totalXP || 0,
            level: player.level || 1,
            streak: player.streak || 0,
            totalWorkouts: player.totalWorkouts || 0,
            achievements: player.achievements || [],
            updated: serverTimestamp()
        },
        {
            merge: true
        }
    );

    updateUI();
}



async function createNotification(
    userID,
    type,
    fromUserID,
    fromUsername,
    postID = null
){

    if(!userID) return;

    if(userID === fromUserID) return;

    try{

        await addDoc(
            collection(db, "notifications"),
            {
                userID: userID,
                type: type,
                fromUserID: fromUserID,
                fromUsername: fromUsername,
                postID: postID,
                read: false,
                createdAt: serverTimestamp()
            }
        );

    }catch(error){

        console.error(
            "Notification error:",
            error
        );

    }

}






// ============================
// SAVE PROFILE
// ============================


 async function saveProfile(){

if(!currentUser) return;


await setDoc(

doc(
db,
"users",
currentUser.uid
),

{

...player,

updated: serverTimestamp()

},

{

merge:true

}

);

}

// ============================
// XP SYSTEM
// ============================


 async function addXP(amount){

player.xp += amount;

player.totalXP += amount;

checkLevel();

await saveProfile();

updateUI();

}





function checkLevel(){


let needed = player.level * 100;



while(player.xp >= needed){


player.xp -= needed;


player.level++;



unlockAchievement(

"Level " + player.level,

"Reached a new level "

);



alert(

" LEVEL UP!\nLevel " + player.level

);



needed = player.level * 100;


}


}







// ============================
// DAILY CHALLENGE
// ============================


function getDailyChallenge(){


let today =
new Date();



let day =
today.getDate();



return challenges[

day % challenges.length

];


}


const workoutExercises = [

    {
        name:"Push Ups",
        type:"strength",
        category:"push",
        style:"bodyweight",
        equipment:"none",
        location:["home","outdoors","mixed"],
        muscles:["chest","shoulders","triceps"],
        sets:3,
        reps:"8-15",
        rest:60,
        weightTracked:false
    },

    {
        name:"Bodyweight Squats",
        type:"strength",
        category:"legs",
        style:"bodyweight",
        equipment:"none",
        location:["home","outdoors","mixed"],
        muscles:["legs"],
        sets:3,
        reps:"10-20",
        rest:60,
        weightTracked:false
    },

    {
        name:"Lunges",
        type:"strength",
        category:"legs",
        style:"bodyweight",
        equipment:"none",
        location:["home","outdoors","mixed"],
        muscles:["legs","glutes"],
        sets:3,
        reps:"8-12 each leg",
        rest:60,
        weightTracked:false
    },

    {
        name:"Plank",
        type:"strength",
        category:"core",
        style:"bodyweight",
        equipment:"none",
        location:["home","outdoors","mixed"],
        muscles:["core"],
        sets:3,
        reps:"20-45 sec",
        rest:45,
        weightTracked:false
    },

    {
        name:"Glute Bridges",
        type:"strength",
        category:"legs",
        style:"bodyweight",
        equipment:"none",
        location:["home","outdoors","mixed"],
        muscles:["glutes","legs"],
        sets:3,
        reps:"10-15",
        rest:60,
        weightTracked:false
    },

    {
    name:"Dumbbell Rows",
    type:"strength",
    category:"pull",
    style:"strength",
    equipment:"dumbbells",
    location:["home","gym","mixed"],
    muscles:["back","biceps"],
    sets:3,
    reps:"8-12",
    rest:90,
    weightTracked:true
},

{
    name:"Dumbbell Shoulder Press",
    type:"strength",
    category:"shoulders",
    style:"strength",
    equipment:"dumbbells",
    location:["home","gym","mixed"],
    muscles:["shoulders","triceps"],
    sets:3,
    reps:"8-12",
    rest:90,
    weightTracked:true
},

 {
    name:"Jumping Jacks",
    type:"cardio",
    category:"cardio",
    style:"cardio",
    equipment:"none",
    location:["home","outdoors","mixed"],
    muscles:["full body"],
    sets:1,
    reps:"30-60 sec",
    rest:30,
weightTracked:false

},

{

name:"Dumbbell Curl",
    type:"strength",
    category:"arms",
    style:"strength",
    equipment:"dumbbells",
    location:["home","gym","mixed"],
    muscles:["biceps"],
    sets:2,
    reps:"8-12",
    rest:60,
    weightTracked:true
},

{
    name:"Dumbbell Bench Press",
    type:"strength",
    category:"push",
    style:"strength",
    equipment:"dumbbells",
    location:["home","gym","mixed"],
    muscles:["chest","shoulders","triceps"],
    sets:3,
    reps:"6-10",
    rest:90,
    weightTracked:true
},

{
    name:"Close Grip Push Ups",
    type:"strength",
    category:"push",
    style:"bodyweight",
    equipment:"none",
    location:["home","outdoors","mixed"],
    muscles:["triceps","chest"],
    sets:2,
    reps:"8-15",
    rest:60,
    weightTracked:false
},

{
    name:"Calf Raises",
    type:"strength",
    category:"legs",
    style:"bodyweight",
    equipment:"none",
    location:["home","outdoors","mixed"],
    muscles:["calves"],
    sets:3,
    reps:"10-20",
    rest:60,
    weightTracked:false
},

{
    name:"Hanging Knee Raises",
    type:"strength",
    category:"core",
    style:"bodyweight",
    equipment:"none",
    location:["home","gym","outdoors","mixed"],
    muscles:["core"],
    sets:2,
    reps:"8-15",
    rest:60,
    weightTracked:false
},

{
    name:"Pull Ups",
    type:"strength",
    category:"pull",
    style:"bodyweight",
    equipment:"none",
    location:["home","outdoors","gym","mixed"],
    muscles:["back","biceps"],
    sets:3,
    reps:"5-10",
    rest:90,
    weightTracked:false
},

{
    name:"Dumbbell Lateral Raise",
    type:"strength",
    category:"shoulders",
    style:"strength",
    equipment:"dumbbells",
    location:["home","gym","mixed"],
    muscles:["shoulders"],
    sets:2,
    reps:"10-15",
    rest:60,
    weightTracked:true
},

{
    name:"Dumbbell Romanian Deadlift",
    type:"strength",
    category:"legs",
    style:"strength",
    equipment:"dumbbells",
    location:["home","gym","mixed"],
    muscles:["hamstrings","glutes"],
    sets:3,
    reps:"8-12",
    rest:90,
    weightTracked:true
},

{
    name:"Dumbbell Goblet Squat",
    type:"strength",
    category:"legs",
    style:"strength",
    equipment:"dumbbells",
    location:["home","gym","mixed"],
    muscles:["quads","glutes"],
    sets:3,
    reps:"8-15",
    rest:90,
    weightTracked:true
},

{
    name:"Mountain Climbers",
    type:"cardio",
    category:"cardio",
    style:"cardio",
    equipment:"none",
    location:["home","outdoors","mixed"],
    muscles:["full body","core"],
    sets:3,
    reps:"20-40 sec",
    rest:45,
    weightTracked:false
},

{
    name:"High Knees",
    type:"cardio",
    category:"cardio",
    style:"cardio",
    equipment:"none",
    location:["home","outdoors","mixed"],
    muscles:["legs","full body"],
    sets:3,
    reps:"20-40 sec",
    rest:45,
    weightTracked:false
},

{
    name:"Dead Bug",
    type:"strength",
    category:"core",
    style:"bodyweight",
    equipment:"none",
    location:["home","outdoors","mixed"],
    muscles:["core"],
    sets:2,
    reps:"8-12 each side",
    rest:45,
    weightTracked:false
},

];


const workoutDays = [
    {
        day:1,
        name:"Full Body A"
    },
    {
        day:2,
        name:"Full Body B"
    },
    {
        day:3,
        name:"Full Body C"
    },
    {
        day:4,
        name:"Full Body D"
    },
    {
        day:5,
        name:"Full Body E"
    }
];


getMatchingExercises()

function getMatchingExercises(){

    const preferences =
        player.workoutPreferences;

    if(!preferences)
        return [];


    return workoutExercises.filter(exercise => {

        // =========================
        // EQUIPMENT
        // =========================

        let equipmentMatch = false;


        if(preferences.equipment.includes("mixed")){

            equipmentMatch = true;

        }
        else if(exercise.equipment === "none"){

            equipmentMatch = true;

        }
        else if(
            preferences.equipment.includes(
                exercise.equipment
            )
        ){

            equipmentMatch = true;

        }


        // =========================
        // LOCATION
        // =========================

        let locationMatch = false;


        if(preferences.location === "mixed"){

            locationMatch = true;

        }
        else if(
            exercise.location.includes(
                preferences.location
            )
        ){

            locationMatch = true;

        }


        // =========================
        // STYLE
        // =========================

        let styleMatch = true;


        if(
            preferences.style &&
            preferences.style !== "mixed"
        ){

            styleMatch =
                exercise.style === preferences.style ||
                exercise.style === "bodyweight";

        }


        return (
            equipmentMatch &&
            locationMatch &&
            styleMatch
        );

    });

}

function getExerciseCount(){

    const time =
        player.workoutPreferences.workoutTime || 30;

    if(time <= 20)
        return 3;

    if(time <= 30)
        return 4;

    if(time <= 45)
        return 5;

    if(time <= 60)
        return 6;

    return 7;

}

function generateWeeklyWorkout(){

    const workoutTypes =
        calculateWorkoutTypes();

    const exercises =
        getMatchingExercises();

    if(!exercises.length){

        alert(
            "We couldn't create a workout with those preferences."
        );

        return null;
    }


    const weeklyPlan = [];


    workoutTypes.forEach(day => {

        // =========================
        // REST DAY
        // =========================

        if(!day.workoutDay){

            weeklyPlan.push({

                day:day.day,

                workoutDay:false,

                type:"rest",

                name:"Rest / Recovery",

                exercises:[]

            });

            return;
        }


        // =========================
        // WARM-UP
        // =========================

        const warmup = {

            name:"Warm-up",

            type:"warmup",

            category:"warmup",

            duration:
                player.workoutPreferences.workoutTime <= 30
                    ? 3
                    : 5,

            instructions:
                "Light movement to prepare for your workout."

        };


        // =========================
        // CATEGORIES
        // =========================

        let categories = [];


        if(day.type === "fullbody"){

            categories = [
                "push",
                "pull",
                "legs",
                "core"
            ];

        }


        else if(day.type === "upper"){

            categories = [
                "push",
                "pull",
                "shoulders",
                "arms"
            ];

        }


        else if(day.type === "lower"){

            categories = [
                "legs",
                "core"
            ];

        }


        else if(day.type === "strength"){

            categories = [
                "push",
                "pull",
                "legs",
                "core"
            ];

        }


        else if(
            day.type === "cardio" ||
            day.type === "conditioning"
        ){

            categories = [
                "cardio"
            ];

        }


        // =========================
        // EXERCISE COUNT
        // =========================

        const exerciseCount =
            getExerciseCount();


        const dayExercises = [];


        // =========================
        // PICK EXERCISES
        // =========================

        categories.forEach((category, index) => {

            if(dayExercises.length >= exerciseCount)
                return;


            const matches =
                exercises.filter(
                    exercise =>
                        exercise.category === category
                );


            if(!matches.length)
                return;


            const choice =
                matches[
                    (day.workoutIndex + index) %
                    matches.length
                ];


            if(!dayExercises.includes(choice)){

                dayExercises.push(choice);

            }

        });


        // =========================
        // FILL REMAINING SLOTS
        // =========================

        if(dayExercises.length < exerciseCount){

            const remaining =
                exercises.filter(
                    exercise =>
                        !dayExercises.includes(exercise)
                );


            for(const exercise of remaining){

                if(dayExercises.length >= exerciseCount)
                    break;


                dayExercises.push(exercise);

            }

        }


        // =========================
        // ADD WARM-UP
        // =========================

        const finalExercises = [
            warmup,
            ...dayExercises
        ];


        // =========================
        // WORKOUT NAME
        // =========================

        let workoutName = "Full Body";


        if(day.type === "upper")
            workoutName = "Upper Body";

        else if(day.type === "lower")
            workoutName = "Lower Body";

        else if(day.type === "cardio")
            workoutName = "Cardio";

        else if(day.type === "conditioning")
            workoutName = "Conditioning";

        else if(day.type === "strength")
            workoutName = "Strength";


        weeklyPlan.push({

            day:day.day,

            workoutDay:true,

            workoutIndex:day.workoutIndex,

            type:day.type,

            name:workoutName,

            exercises:finalExercises

        });

    });


    return weeklyPlan;

}
function calculateWorkoutTypes(){

    const preferences =
        player.workoutPreferences;

    const schedule =
        generateWorkoutSchedule();

    const goal =
        preferences.goal;

    const trainingDays =
        preferences.trainingDays.length;

    const types = [];


    schedule.forEach(day => {

        // REST DAY
        if(!day.workoutDay){

            types.push({
                day:day.day,
                workoutDay:false,
                type:"rest"
            });

            return;

        }


        let type = "fullbody";


        // =========================
        // BUILD STRENGTH
        // =========================

        if(goal === "strength"){

            type = "fullbody";

        }


        // =========================
        // BUILD MUSCLE
        // =========================

        else if(goal === "muscle"){

            if(trainingDays <= 2){

                type = "fullbody";

            }
            else if(trainingDays === 3){

                const muscleTypes = [
                    "upper",
                    "lower",
                    "fullbody"
                ];

                type =
                    muscleTypes[
                        day.workoutIndex %
                        muscleTypes.length
                    ];

            }
            else{

                const muscleTypes = [
                    "upper",
                    "lower",
                    "upper",
                    "lower",
                    "fullbody",
                    "upper",
                    "lower"
                ];

                type =
                    muscleTypes[
                        day.workoutIndex %
                        muscleTypes.length
                    ];

            }

        }


        // =========================
        // GET FITTER
        // =========================

        else if(goal === "fitness"){

            if(trainingDays === 1){

                type = "fullbody";

            }
            else if(trainingDays === 2){

                const fitnessTypes = [
                    "fullbody",
                    "conditioning"
                ];

                type =
                    fitnessTypes[
                        day.workoutIndex %
                        fitnessTypes.length
                    ];

            }
            else{

                const fitnessTypes = [
                    "fullbody",
                    "conditioning",
                    "fullbody",
                    "cardio",
                    "fullbody",
                    "conditioning",
                    "fullbody"
                ];

                type =
                    fitnessTypes[
                        day.workoutIndex %
                        fitnessTypes.length
                    ];

            }

        }


        // =========================
        // STAY IN SHAPE
        // =========================

        else if(goal === "general" || goal === "balanced"){

            if(trainingDays <= 2){

                type = "fullbody";

            }
            else{

                const balancedTypes = [
                    "fullbody",
                    "conditioning",
                    "fullbody",
                    "cardio",
                    "fullbody",
                    "conditioning",
                    "fullbody"
                ];

                type =
                    balancedTypes[
                        day.workoutIndex %
                        balancedTypes.length
                    ];

            }

        }


        types.push({

            day:day.day,

            workoutDay:true,

            workoutIndex:day.workoutIndex,

            type:type

        });

    });


    return types;

}

window.displayTodaysWorkout = function(){

    const box = document.getElementById("todayWorkout");

    if(!box){
        console.log("todayWorkout element not found");
        return;
    }

   if(!player.workoutPlan){

    box.innerHTML = "";

    return;
}

    const weekDays = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday"
    ];

    const today = weekDays[new Date().getDay()];

    const workout = player.workoutPlan.find(
        day => day.day === today
    );

    if(!workout){
        box.innerHTML = `
            <h3>No Workout Found</h3>
            <p>There is no workout scheduled for today.</p>
        `;
        return;
    }

    if(!workout.workoutDay){
        box.innerHTML = `
            <h3>Today's Workout</h3>
            <h4>Rest / Recovery</h4>
            <p>Today is a recovery day.</p>
            <button id="resetWorkoutButton">
                Reset Workout
            </button>
        `;

        document
            .getElementById("resetWorkoutButton")
            ?.addEventListener("click", window.resetWorkout);

        return;
    }

    let html = `
        <h3>Today's Workout</h3>
        <h4>${workout.name}</h4>
    `;

    workout.exercises.forEach(exercise => {

        html += `
            <div class="exercise">
                <strong>${exercise.name}</strong>
        `;

        if(exercise.type === "warmup"){

            html += `
                <p>${exercise.duration} minutes</p>
                <small>${exercise.instructions}</small>
            `;

        }
        else{

            html += `
                <p>
                    ${exercise.sets || ""}
                    ${exercise.sets ? " sets " : ""}
                    ${exercise.reps || ""}
                </p>

                ${
                    exercise.rest
                    ? `<small>Rest: ${exercise.rest} sec</small>`
                    : ""
                }
            `;

        }

        html += `
            </div>
        `;

    });

    html += `
        <button id="completeWorkoutButton">
            Complete Workout
        </button>

        <button id="resetWorkoutButton">
            Reset Workout
        </button>
    `;

    box.innerHTML = html;

    document
        .getElementById("completeWorkoutButton")
        ?.addEventListener("click", window.completeWorkout);

    document
        .getElementById("resetWorkoutButton")
        ?.addEventListener("click", window.resetWorkout);

};

window.displayWeeklyWorkoutSchedule = function(){

    const list =
        document.getElementById("weeklyScheduleList");

    if(!list) return;

    if(!player.workoutPlan){

        list.innerHTML = `
            <p>Create a workout to see your weekly schedule.</p>
        `;

        return;
    }

    list.innerHTML = "";

    player.workoutPlan.forEach(day => {

        const dayName =
            day.day.charAt(0).toUpperCase() +
            day.day.slice(1);

        const button =
            document.createElement("button");

        button.className = "weekly-day";

        button.innerHTML = `
            <strong>${dayName}</strong>
            <span>
                ${
                    day.workoutDay
                    ? day.name
                    : "Rest / Recovery"
                }
            </span>
        `;

        button.addEventListener("click", () => {

            window.showScheduledWorkout(day.day);

        });

        list.appendChild(button);

    });

};
window.showScheduledWorkout = function(dayName){

    if(!player.workoutPlan) return;

    const workout =
        player.workoutPlan.find(
            day => day.day === dayName
        );

    if(!workout) return;

    const box =
        document.getElementById("todayWorkout");

    if(!box) return;

    if(!workout.workoutDay){

        box.innerHTML = `
            <h3>${dayName.charAt(0).toUpperCase() + dayName.slice(1)}</h3>

            <h4>Rest / Recovery</h4>

            <p>Today is a recovery day.</p>

            <button id="backToTodayButton">
                Back to Today
            </button>
        `;

        document
            .getElementById("backToTodayButton")
            ?.addEventListener(
                "click",
                window.displayTodaysWorkout
            );

        return;
    }

    let html = `
        <h3>${dayName.charAt(0).toUpperCase() + dayName.slice(1)}</h3>
        <h4>${workout.name}</h4>
    `;

    workout.exercises.forEach(exercise => {

        html += `
            <div class="exercise">
                <strong>${exercise.name}</strong>
        `;

        if(exercise.type === "warmup"){

            html += `
                <p>${exercise.duration} minutes</p>
                <small>${exercise.instructions}</small>
            `;

        } else {

            html += `
                <p>
                    ${exercise.sets || ""}
                    ${exercise.sets ? " sets " : ""}
                    ${exercise.reps || ""}
                </p>

                ${
                    exercise.rest
                    ? `<small>Rest: ${exercise.rest} sec</small>`
                    : ""
                }
            `;

        }

        html += `
            </div>
        `;

    });

    html += `
        <button id="backToTodayButton">
            Back to Today
        </button>
    `;

    box.innerHTML = html;

    document
        .getElementById("backToTodayButton")
        ?.addEventListener(
            "click",
            window.displayTodaysWorkout
        );

};





window.completeWorkout = async function(){

    if(!currentUser){

        document.getElementById("authPopup").style.display = "flex";

        return;
    }


    // =========================
    // CHECK TODAY
    // =========================

    const today =
        new Date().toDateString();

    if(player.lastWorkout === today){

        alert(
            "You already completed today's challenge"
        );

        return;
    }


    // =========================
    // GET TODAY'S WORKOUT
    // =========================

    let workout = null;

    if(player.workoutPlan){

        const weekDays = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday"
        ];

        const todayName =
            weekDays[new Date().getDay()];

        workout =
            player.workoutPlan.find(
                day => day.day === todayName
            );

    }


    // =========================
    // CHECK STREAK
    // =========================

    if(player.lastWorkout){

        const last =
            new Date(player.lastWorkout);

        const current =
            new Date();

        const difference =
            Math.floor(
                (current - last) /
                (1000 * 60 * 60 * 24)
            );


        if(difference === 1){

            player.streak++;

        }
        else if(difference > 1){

            player.streak = 1;

        }

    }
    else{

        player.streak = 1;

    }


    player.lastWorkout =
        today;

    player.totalWorkouts++;


    // =========================
    // SAVE WORKOUT HISTORY
    // =========================

    if(workout && workout.workoutDay){

        player.workoutHistory =
            player.workoutHistory || [];

            player.workoutProgress =
    player.workoutProgress || {};

player.workoutProgress[workout.day] = {
    completed:true,
    completedAt:new Date().toISOString()
};

        player.workoutHistory.push({

            day: workout.day,

            type: workout.type,

            name: workout.name,

            completedAt:
                new Date().toISOString(),

            exercises:
                workout.exercises.map(exercise => ({

                    name: exercise.name,

                    sets:
                        exercise.sets || null,

                    reps:
                        exercise.reps || null

                }))

        });

    }


    // =========================
    // BASE XP
    // =========================

    await addXP(50);


    // =========================
    // STREAK REWARDS
    // =========================

    checkStreakRewards();


    // =========================
    // SAVE
    // =========================

    await saveProfile();


    // =========================
    // UPDATE SCREEN IMMEDIATELY
    // =========================

   updateUI();

updateAchievements();

displayTodaysWorkout();

displayWeeklyWorkoutSchedule();

alert(
    "+50 XP Earned!"
);

};

window.resetWorkout = function(){

    if(!currentUser){

        document.getElementById("authPopup").style.display = "flex";

        return;
    }

    const confirmReset = confirm(
        "Reset your current workout and choose new preferences?"
    );

    if(!confirmReset) return;

    player.workoutPlan = null;
    player.workoutProgress = {};
    player.workoutHistory = [];

    saveProfile()
        .then(() => {

            const setup =
                document.getElementById("workoutSetup");

            const form =
                document.getElementById("workoutSetupForm");

            if(setup)
                setup.style.display = "block";

            if(form)
                form.style.display = "block";

            window.displayTodaysWorkout();
            window.displayWeeklyWorkoutSchedule();

        })
        .catch(error => {

            console.error("RESET WORKOUT ERROR:", error);

            alert("Could not reset workout.");

        });

};










// ============================
// ACHIEVEMENTS
// ============================


function unlockAchievement(title,description){



let exists =

player.achievements.find(

a=>a.title===title

);



if(exists)

return;





player.achievements.push({


title:title,


description:description,


date:new Date().toDateString()



});








}






function updateAchievements(){


const boxes=[


document.getElementById(

"achievements"

),


document.getElementById(

"homeAchievements"

)

];



boxes.forEach(box=>{


if(!box)

return;



if(player.achievements.length===0){


box.innerHTML=

"No achievements yet.";



return;


}



box.innerHTML="";



player.achievements.forEach(a=>{


box.innerHTML += `


<div class="achievement">


 ${a.title}

<br>

<small>

${a.description}

</small>


</div>


`;



});



});



}


function generateWorkoutSchedule(){

    const preferences = player.workoutPreferences;

    const trainingDays = preferences.trainingDays || [];

    const days = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
    ];

    let workoutIndex = 0;

    return days.map(day => {

        const workoutDay =
            trainingDays.includes(day);

        const result = {
            day: day,
            workoutDay: workoutDay,
            workoutIndex: workoutDay ? workoutIndex : null
        };

        if(workoutDay){
            workoutIndex++;
        }

        return result;

    });

}

// ============================
// UPDATE UI
// ============================

function updateUI(){

    const elements = {

        homeUsername: player.username,
        xp: player.totalXP,
        homeLevel: player.level,
        streak: player.streak,

        profileUsername: player.username,
        profileXP: player.totalXP,
        profileLevel: player.level,
        profileStreak: player.streak,

        workouts: player.totalWorkouts,
        followers: player.followers,
        following: player.following

    };

    Object.keys(elements).forEach(id => {

        const element = document.getElementById(id);

        if(element){
            element.innerText = elements[id];
        }

    });


    // XP BAR

    const xpBar = document.getElementById("xpBar");
    const needed = player.level * 100;

    if(xpBar){

        xpBar.style.width =
            Math.min(
                (player.xp / needed) * 100,
                100
            ) + "%";

    }

    const xpText = document.getElementById("xpText");

    if(xpText){

        xpText.innerText =
            player.xp + " / " + needed + " XP";

    }


    // STREAK BAR

    const streakBar =
        document.getElementById("streakBar");

    const streakText =
        document.getElementById("streakText");

    if(streakBar && streakText){

        const streak = player.streak || 0;

        let target;

        if(streak < 3){
            target = 3;
        }
        else if(streak < 7){
            target = 7;
        }
        else if(streak < 14){
            target = 14;
        }
        else if(streak < 30){
            target = 30;
        }
        else if(streak < 60){
            target = 60;
        }
        else if(streak < 100){
            target = 100;
        }
        else{
            target = streak + 30;
        }

        const progress =
            Math.min(
                (streak / target) * 100,
                100
            );

        streakBar.style.width =
            progress + "%";

        streakText.innerText =
            streak + " / " + target + " Days";

    }


    const setup = document.getElementById("workoutSetup");
    const form = document.getElementById("workoutSetupForm");

    if(player.workoutPlan){

        if(setup)
            setup.style.display = "none";

        if(form)
            form.style.display = "none";

    }
    else{

        if(setup)
            setup.style.display = "block";

        if(form)
            form.style.display = "none";

    }


}

let viewedUserID = null;


window.openUserProfile = async function(userID){

    if(!userID) return;

    viewedUserID = userID;

    const userRef = doc(db,"users",userID);

    const userSnap = await getDoc(userRef);

    if(!userSnap.exists()){

        alert("User not found.");

        return;

    }

    const data = userSnap.data();

    document.getElementById("viewUserProfileImage").src =
        data.profilePic ||
        "https://placehold.co/180x180?text=TFY";

    document.getElementById("viewUserUsername").textContent =
        data.username || "User";

    document.getElementById("viewUserBio").textContent =
        data.bio || "No bio yet.";

    document.getElementById("viewUserFollowers").textContent =
        data.followersCount || 0;

    document.getElementById("viewUserFollowing").textContent =
        data.followingCount || 0;


    document.querySelectorAll(".page").forEach(page => {

        page.classList.remove("active");

    });


    document.getElementById("userProfile").classList.add("active");

    const followingRef = doc(
    db,
    "users",
    currentUser.uid,
    "following",
    userID
);

const followingSnap = await getDoc(followingRef);

const followButton =
    document.getElementById("viewUserFollowButton");

if(followButton){

    followButton.textContent =
        followingSnap.exists()
        ? "Following"
        : "Follow";

}

    loadViewedUserPosts(userID);

    loadFollowCounts(userID);

};


window.closeUserProfile = function(){

    viewedUserID = null;

    document.querySelectorAll(".page").forEach(page => {

        page.classList.remove("active");

    });

    document.getElementById("feed").classList.add("active");

};



window.openWorkoutSetup = function(){

    const form =
        document.getElementById("workoutSetupForm");

    if(!form) return;


    const preferences =
        player.workoutPreferences || {};


    document.getElementById("workoutAge").value =
        preferences.age || "";


    document.getElementById("workoutGoal").value =
        preferences.goal || "";


    document.getElementById("workoutTime").value =
        preferences.workoutTime || 30;


    document.getElementById("workoutEquipment").value =
        preferences.equipment?.[0] || "none";


    document.getElementById("workoutLocation").value =
        preferences.location || "";


    document.getElementById("workoutExperience").value =
        preferences.experience || "";


    document.getElementById("workoutLimitations").value =
        preferences.limitations || "none";


    document.getElementById("workoutStyle").value =
        preferences.style || "";


    // Restore selected training days
    const trainingDays =
        preferences.trainingDays || [];


    document.querySelectorAll(
        '#trainingDays input[type="checkbox"]'
    ).forEach(checkbox => {

        checkbox.checked =
            trainingDays.includes(checkbox.value);

    });


    form.style.display = "block";


    form.scrollIntoView({

        behavior:"smooth",

        block:"start"

    });

}

window.saveWorkoutPreferences = async function(){

    if(!currentUser){
        alert("Login to create a personalized workout.");
        return;
    }

    const age =
        Number(document.getElementById("workoutAge").value);

    const goal =
        document.getElementById("workoutGoal").value;

    const workoutTime =
        Number(document.getElementById("workoutTime").value);

    const equipment =
        document.getElementById("workoutEquipment").value;

    const location =
        document.getElementById("workoutLocation").value;

    const experience =
        document.getElementById("workoutExperience").value;

    const limitations =
        document.getElementById("workoutLimitations").value;

    const style =
        document.getElementById("workoutStyle").value;

    const trainingDays =
        Array.from(
            document.querySelectorAll(
                '#trainingDays input[type="checkbox"]:checked'
            )
        ).map(checkbox => checkbox.value);


    if(!age || age < 13){
        alert("Please enter your age.");
        return;
    }

    if(!goal || !location || !experience || !style){
        alert("Please complete all workout preferences.");
        return;
    }

    if(trainingDays.length === 0){
        alert("Choose at least one training day.");
        return;
    }


    player.workoutPreferences = {

        age: age,

        goal: goal,

        daysPerWeek: trainingDays.length,

        trainingDays: trainingDays,

        workoutTime: workoutTime,

        equipment: [equipment],

        location: location,

        experience: experience,

        limitations: limitations,

        style: style

    };


    const plan =
        generateWeeklyWorkout();


    if(!plan)
        return;


    player.workoutPlan = plan;

    player.workoutProgress = {};

    player.workoutHistory = [];


    await saveProfile();


    // HIDE SETUP

    const setup =
        document.getElementById("workoutSetup");

    const form =
        document.getElementById("workoutSetupForm");


    if(setup)
        setup.style.display = "none";

    if(form)
        form.style.display = "none";


    // SHOW WORKOUT

    window.displayTodaysWorkout();

    window.displayWeeklyWorkoutSchedule();

};
async function loadAdminReports(){

    const box =
        document.getElementById("adminReports");

    if(!box) return;

    box.innerHTML =
        "Loading reports...";

    try{

        const q = query(
            collection(db,"reports"),
            orderBy("createdAt","desc")
        );

        const snapshot =
            await getDocs(q);

        box.innerHTML = "";

        if(snapshot.empty){

            box.innerHTML =
                "<p>No reports.</p>";

            return;

        }

        snapshot.forEach(docSnap => {

            const report =
                docSnap.data();

            const div =
                document.createElement("div");

            div.className = "card";

            div.innerHTML = `

                <h3>🚩 Report</h3>

                <p>
                    <b>Reported by:</b>
                    ${report.reporterUsername || "Unknown"}
                </p>

                <p>
                    <b>Reason:</b>
                    ${report.reason || "No reason"}
                </p>

                ${
                    report.postID
                    ? `
                    <button
                        onclick="deleteReportedPost('${report.postID}','${docSnap.id}')"
                    >
                        DELETE POST
                    </button>
                    `
                    : ""
                }

                <button
                    onclick="dismissReport('${docSnap.id}')"
                >
                    DISMISS
                </button>

            `;

            box.appendChild(div);

        });

    }catch(error){

        console.error(
            "Admin reports error:",
            error
        );

        box.innerHTML =
            "<p>Could not load reports.</p>";

    }

}


window.deleteReportedPost = async function(
    postID,
    reportID
){

    if(!currentUser) return;

    try{

        await deleteDoc(
            doc(db,"posts",postID)
        );

        await deleteDoc(
            doc(db,"reports",reportID)
        );

        alert("Post deleted.");

        loadAdminReports();

    }catch(error){

        console.error(
            "Delete report error:",
            error
        );

        alert(
            "Could not delete post."
        );

    }

};


window.dismissReport = async function(reportID){

    try{

        await deleteDoc(
            doc(db,"reports",reportID)
        );

        loadAdminReports();

    }catch(error){

        console.error(error);

    }

};





window.toggleFollow = async function(){

    if(!currentUser){

        alert("Login to follow users.");

        return;

    }

    if(!viewedUserID){

        return;

    }

    if(currentUser.uid === viewedUserID){

        return;

    }

    const followingRef = doc(
        db,
        "users",
        currentUser.uid,
        "following",
        viewedUserID
    );

    const followerRef = doc(
        db,
        "users",
        viewedUserID,
        "followers",
        currentUser.uid
    );

    const followingSnap = await getDoc(followingRef);

    const button =
        document.getElementById("viewUserFollowButton");

    if(followingSnap.exists()){

        await deleteDoc(followingRef);

        await deleteDoc(followerRef);

        button.textContent = "Follow";

    }else{

        await setDoc(followingRef,{

            userID: viewedUserID,

            createdAt: serverTimestamp()

        });

       

        await setDoc(followerRef,{

            userID: currentUser.uid,

            createdAt: serverTimestamp()

        });

        button.textContent = "Following";

    }

await loadFollowCounts(viewedUserID);

};


async function loadFollowCounts(userID){

    const followersSnap = await getDocs(
        collection(
            db,
            "users",
            userID,
            "followers"
        )
    );

    const followingSnap = await getDocs(
        collection(
            db,
            "users",
            userID,
            "following"
        )
    );

    const followersElement =
        document.getElementById("viewUserFollowers");

    const followingElement =
        document.getElementById("viewUserFollowing");

    if(followersElement){

        followersElement.textContent =
            followersSnap.size;

    }

    if(followingElement){

        followingElement.textContent =
            followingSnap.size;

    }

}



async function loadViewedUserPosts(userID){

    const box =
        document.getElementById("viewUserPosts");

    if(!box) return;

    const q = query(
        collection(db,"posts"),
        where("userID","==",userID),
        orderBy("createdAt","desc")
    );

    onSnapshot(q,(snapshot)=>{

        box.innerHTML = "";

        snapshot.forEach((post)=>{

            const data = post.data();

            box.innerHTML += `

                <div class="card post-card">

                    <h3>
                        ${data.username || "TFY Athlete"}
                    </h3>

                    <p>
                        ${data.caption || ""}
                    </p>

                    <div class="post-actions">

                        <button
                            onclick="likePost('${post.id}')"
                        >
                            ❤️ ${data.likes || 0}
                        </button>

                        <button
                            onclick="openComments('${post.id}')"
                        >
                            💬 Comment
                        </button>

                        <button
                            onclick="sharePost('${data.caption || ""}')"
                        >
                            ↗ Share
                        </button>

                    </div>

                </div>

            `;

        });

    });

}


window.reportPost = async function(postID){

    if(!currentUser){

        alert("Login required to report.");

        return;

    }

    const reason = prompt(
        "Why are you reporting this post?\n\n" +
        "Inappropriate\n" +
        "Spam\n" +
        "Harassment\n" +
        "Other"
    );

    if(!reason) return;

    try{
{
    type: "post",
   await addDoc(
    collection(db, "reports"),
    {
        type: "post",
        postID: postID,

        reportedBy: currentUser.uid,
        reporterUsername: player.username || "Unknown",

        reason: reason,

        status: "pending",

        createdAt: serverTimestamp()
    }
);

}

        alert("Report submitted. Thank you.");

    }catch(error){

        console.error("Report error:", error);

        alert("Could not submit report.");

    }

};


function loadNotifications(){

    const list =
        document.getElementById("notificationList");

    if(!list || !currentUser) return;

    const twentyFourHoursAgo =
        new Date(Date.now() - 24 * 60 * 60 * 1000);

    const q = query(
        collection(db, "notifications"),
        where("userID", "==", currentUser.uid),
        where("createdAt", ">=", twentyFourHoursAgo),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    onSnapshot(q, (snapshot) => {

        list.innerHTML = "";

        let unread = 0;

        snapshot.forEach(notification => {

            const data =
                notification.data();

            if(!data.read){
                unread++;
            }

            let message = "";

            if(data.type === "like"){

                message =
                    `❤️ <b>${data.fromUsername}</b> liked your post`;

            }

            else if(data.type === "comment"){

                message =
                    `💬 <b>${data.fromUsername}</b> commented on your post`;

            }

            else if(data.type === "follow"){

                message =
                    `👤 <b>${data.fromUsername}</b> followed you`;

            }

            else{

                message =
                    `🔔 <b>${data.fromUsername || "Someone"}</b> interacted with you`;

            }

            const item =
                document.createElement("div");

            item.className =
                "card notification-item";

            item.innerHTML = `
                <p>${message}</p>
            `;

            list.appendChild(item);

        });

        if(snapshot.empty){

            list.innerHTML =
                "<p>No notifications in the last 24 hours.</p>";

        }

        updateNotificationCount(unread);

    });

}

function updateNotificationCount(count){

    const badge =
        document.getElementById("notificationCount");

    if(!badge) return;

    badge.innerText = count;

    badge.style.display =
        count > 0
        ? "inline-block"
        : "none";

}



async function loadOwnFollowCounts(){

    if(!currentUser) return;

    const followersSnap = await getDocs(
        collection(
            db,
            "users",
            currentUser.uid,
            "followers"
        )
    );

    const followingSnap = await getDocs(
        collection(
            db,
            "users",
            currentUser.uid,
            "following"
        )
    );

    const followers =
        document.getElementById("profileFollowers");

    const following =
        document.getElementById("profileFollowing");

    if(followers){
        followers.textContent = followersSnap.size;
    }

    if(following){
        following.textContent = followingSnap.size;
    }

}






// ============================
// NAVIGATION
// ============================


function openPage(page){



document
.querySelectorAll(".page")
.forEach(section=>{


section.classList.remove("active");


});




const selected =

document.getElementById(page);



if(selected){


selected.classList.add("active");


}





document
.querySelectorAll(".tabs button")
.forEach(btn=>{


btn.classList.remove("active");


});





const tab =

document.getElementById(

page+"Tab"

);



if(tab){

    tab.classList.add("active");

}

if(page === "home"){

    setTimeout(() => {

        if(typeof window.displayTodaysWorkout === "function"){
            window.displayTodaysWorkout();
        }

        if(typeof window.displayWeeklyWorkoutSchedule === "function"){
            window.displayWeeklyWorkoutSchedule();
        }

    }, 0);

}

}



const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_DAILY_MEDIA_POSTS = 5;


async function validatePostMedia(file){

    if(!file){
        return {
            valid: true,
            type: null
        };
    }


    const status =
        document.getElementById("mediaUploadStatus");


    if(!file.type.startsWith("image/") &&
       !file.type.startsWith("video/")){

        if(status){
            status.textContent =
                "Only images and videos are allowed.";
        }

        return {
            valid: false
        };
    }


    // IMAGE
    if(file.type.startsWith("image/")){

        if(file.size > MAX_IMAGE_SIZE){

            if(status){
                status.textContent =
                    "Images must be 5 MB or smaller.";
            }

            return {
                valid: false
            };
        }

        return {
            valid: true,
            type: "image"
        };
    }


    // VIDEO
    if(file.type.startsWith("video/")){

        if(file.size > MAX_VIDEO_SIZE){

            if(status){
                status.textContent =
                    "Videos must be 25 MB or smaller.";
            }

            return {
                valid: false
            };
        }


        const duration =
            await getVideoDuration(file);


        if(duration > MAX_VIDEO_DURATION){

            if(status){
                status.textContent =
                    "Videos must be 30 seconds or shorter.";
            }

            return {
                valid: false
            };
        }


        return {
            valid: true,
            type: "video"
        };
    }

}



async function checkVideoUpload() {

    const input = document.getElementById("videoUpload");

    if (!input || !input.files[0]) return true;

    const file = input.files[0];

    if (file.size > MAX_VIDEO_SIZE) {
        alert("Video must be 25 MB or smaller.");
        input.value = "";
        return false;
    }

    const video = document.createElement("video");

    video.preload = "metadata";

    const url = URL.createObjectURL(file);

    return new Promise((resolve) => {

        video.onloadedmetadata = () => {

            URL.revokeObjectURL(url);

            if (video.duration > MAX_VIDEO_DURATION) {

                alert("Video must be 30 seconds or shorter.");

                input.value = "";

                resolve(false);

                return;
            }

            resolve(true);
        };

        video.onerror = () => {

            URL.revokeObjectURL(url);

            alert("Could not read this video.");

            input.value = "";

            resolve(false);
        };

        video.src = url;

    });
}









// ============================
// PROFILE UPDATE
// ============================


async function updateProfile(){



if(!currentUser){


alert(

"Login first"

);


return;


}




const bio =

document.getElementById(

"bioInput"

);



if(bio){


player.bio =
bio.value;


}





await saveProfile();


updateUI();



alert(

"Profile saved"

);


}








 // ============================
// LEADERBOARD
// ============================

 function loadLeaderboard(){

const board =
document.getElementById("leaderboard");


if(!board) return;



const q=query(

collection(db,"users"),

orderBy("totalXP","desc"),

limit(10)

);



onSnapshot(q,(snapshot)=>{


board.innerHTML="";


let rank=1;


snapshot.forEach((user)=>{


const data=user.data();


board.innerHTML += `

<div class="card rank-card">

<img
class="profile-picture"
src="${data.profilePic || 'https://placehold.co/50x50?text=TFY'}"
onclick="openUserProfile('${user.id}')"
style="cursor:pointer;"
>


<br>

#${rank}

<br>

${data.username || "TFY Athlete"}

<br>

Level ${data.level || 1}

<br>

${data.totalXP || 0} XP

</div>

`;

rank++;


});


});


}


// ============================
// LOAD FEED
// ============================

 function loadFeed(){

const feed = document.getElementById("videoFeed");

if(!feed) return;


const q = query(
collection(db,"posts"),
orderBy("createdAt","desc")
);


onSnapshot(q,(snapshot)=>{

  

feed.innerHTML = "";


snapshot.forEach((post)=>{

  

const data = post.data();


feed.innerHTML += `

<div id="post-${post.id}" class="card post-card">


<div class="post-header">

<img
src="${data.profilePic || 'https://placehold.co/80x80?text=TFY'}"
class="rank-profile-picture"
>

<h3
    onclick="openUserProfile('${data.userID}')"
    style="cursor:pointer;"
>
    ${data.username}
</h3>

</div>


<p>
${data.caption}
</p>


<div class="post-actions">


${data.mediaURL ? `
    <video
        src="${data.mediaURL}"
        controls
        playsinline
        preload="metadata"
        style="width:100%; border-radius:12px;"
    ></video>
` : ""}

<button onclick="likePost('${post.id}')">
❤️ ${data.likes || 0}
</button>

<button onclick="openComments('${post.id}')">
💬 Comment
</button>

<button onclick="sharePost('${data.caption}', '${post.id}')">
↗ Share
</button>

<button onclick="reportPost('${post.id}')">
⚠️ Report
</button>


</div>


</div>`;

});

openSharedPost();

});

}


function openSharedPost(){

    const params = new URLSearchParams(window.location.search);

    const postID = params.get("post");

    if(!postID) return;

    const postElement = document.getElementById("post-" + postID);

    if(postElement){

        postElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        postElement.style.outline = "3px solid #ffffff";

        setTimeout(() => {

            postElement.style.outline = "";

        }, 3000);

    }

}


window.searchUsers = async function(){

    const input = document.getElementById("userSearchInput");
    const results = document.getElementById("userSearchResults");

    if(!input || !results) return;

    const searchText = input.value.trim().toLowerCase();

    if(!searchText){
        results.innerHTML = "";
        return;
    }

    const q = query(
        collection(db, "users"),
        orderBy("username"),
        limit(20)
    );

    const snapshot = await getDocs(q);

    results.innerHTML = "";

    snapshot.forEach((user)=>{

        const data = user.data();

        if(!data.username) return;

        if(!data.username.toLowerCase().includes(searchText)) return;

        results.innerHTML += `

            <div class="card search-user">

                <img
                    class="profile-picture"
                    src="${data.profilePic || 'https://placehold.co/50x50?text=TFY'}"
                    onclick="openUserProfile('${user.id}')"
                    style="cursor:pointer;"
                >

                <h3
                    onclick="openUserProfile('${user.id}')"
                    style="cursor:pointer;"
                >
                    ${data.username}
                </h3>

            </div>

        `;

    });

};


 // ============================
// LIKE POST + GIVE XP
// ============================
window.likePost = async function(postID){

    if(!currentUser){

        alert(
            "Login to join the TFY community and like workouts."
        );

        return;

    }

    // Prevent rapid repeated clicks
    if(window.likingPosts && window.likingPosts[postID]){
        return;
    }

    if(!window.likingPosts){
        window.likingPosts = {};
    }

    window.likingPosts[postID] = true;

    try{

        const postRef = doc(db, "posts", postID);

        const postSnap = await getDoc(postRef);

        if(!postSnap.exists()) return;

        const postData = postSnap.data();

        const likedBy = postData.likedBy || [];

        const alreadyLiked =
            likedBy.includes(currentUser.uid);

        if(alreadyLiked){

            await updateDoc(postRef, {

                likes: increment(-1),

                likedBy:
                    arrayRemove(currentUser.uid)

            });

        }else{

            await updateDoc(postRef, {

                likes: increment(1),

                likedBy:
                    arrayUnion(currentUser.uid)

            });

            // Notification only when actually liking
            await createNotification(
                postData.userID,
                "like",
                currentUser.uid,
                player.username,
                postID
            );

        }

    }catch(error){

        console.error(
            "Like error:",
            error
        );

    }finally{

        window.likingPosts[postID] = false;

    }

};

// ============================
// LOAD PROFILE POSTS
// ============================

function loadProfilePosts(){

const box =
document.getElementById("profilePosts");


if(!box) return;


if(!currentUser) return;


const q = query(

collection(db,"posts"),

orderBy(
"createdAt",
"desc"
)

);


onSnapshot(q,(snapshot)=>{


box.innerHTML="";


snapshot.forEach(post=>{


const data = post.data();


if(data.userID === currentUser.uid){


box.innerHTML += `

<div class="card post-card">

<h3>
${data.username}
</h3>


<p>
${data.caption}
</p>


   <button onclick="alert('LIKE BUTTON WORKS')">
❤️ ${data.likes || 0}
</button>


</div>

`;

}


});


});

}



window.sharePost = async function(text){

    const shareText =
        "Check out this workout on TFYFitness!\n\n" +
        text +
        "\n\nThink For Yourself";

    if(navigator.share){

        try{

            await navigator.share({

                title:"TFY Workout",

                text:shareText

            });

        }catch(error){

            // User closed the share menu
            console.log("Share cancelled");

        }

    }

    else{

        try{

            await navigator.clipboard.writeText(shareText);

            alert("Workout copied to clipboard!");

        }catch(error){

            alert("Share your TFY workout!");

        }

    }

};





// ============================
// POST POPUP FUNCTIONS
// ============================


function openPost(){


const popup =
document.getElementById("postPopup");



if(popup){

popup.style.display="flex";

}


}




function closePost(){


const popup =
document.getElementById("postPopup");



if(popup){

popup.style.display="none";

}


}



// ============================
// COMMENTS
// ============================


console.log("COMMENTS LOADED");

let currentCommentPost = null;

window.openComments = function(postID){

currentCommentPost = postID;

const popup = document.getElementById("commentPopup");

if(popup){
popup.style.display = "flex";
}

loadComments(postID);

};

window.closeComments = function(){

const popup = document.getElementById("commentPopup");

if(popup){
popup.style.display = "none";
}

currentCommentPost = null;

};





window.sendComment = async function(){


if(!currentUser){

alert("Login to comment");

return;

}


const text = document.getElementById("commentText").value;


if(!text.trim()) return;



await addDoc(
collection(db,"comments"),
{

postID: currentCommentPost,

userID: currentUser.uid,

username: player.username,

profilePic: player.profilePic || "",

text:text,

createdAt: serverTimestamp()

}

);



document.getElementById("commentText").value="";


}






 window.loadComments = function(postID){


const box = document.getElementById("commentList");


if(!box) return;



const q = query(

collection(db,"comments"),

where("postID","==",postID),

orderBy("createdAt","asc")

);



onSnapshot(q,(snapshot)=>{


box.innerHTML="";


snapshot.forEach((comment)=>{


const data = comment.data();



box.innerHTML += `

<div class="comment">

<img
class="comment-profile-picture"
src="${data.profilePic || 'https://placehold.co/40x40?text=TFY'}"
>

<div class="comment-content">

<b>${data.username}</b>

<p>${data.text}</p>

${
    currentUser && currentUser.uid === data.userID
    ? `<button onclick="deleteComment('${comment.id}')">Delete</button>`
    : ""
}

</div>

</div>

`;



});


});


}


window.deleteComment = async function(commentID){

    if(!currentUser){

        alert("Login required.");

        return;

    }

    try{

        const commentRef = doc(
            db,
            "comments",
            commentID
        );

        const commentSnap = await getDoc(commentRef);

        if(!commentSnap.exists()) return;

        const data = commentSnap.data();

        if(data.userID !== currentUser.uid){

            alert("You can only delete your own comments.");

            return;

        }

        await deleteDoc(commentRef);

    }catch(error){

        console.error("Error deleting comment:", error);

        alert("Could not delete comment.");

    }

};


window.openFollowList = async function(type){

    if(!viewedUserID) return;

    const list = document.getElementById("followList");
    const content = document.getElementById("followListContent");
    const title = document.getElementById("followListTitle");

    if(!list || !content || !title) return;

    list.style.display = "block";

    title.textContent =
        type === "followers"
        ? "Followers"
        : "Following";

    content.innerHTML = "Loading...";

    const q = collection(
        db,
        "users",
        viewedUserID,
        type
    );

    const snapshot = await getDocs(q);

    content.innerHTML = "";

    if(snapshot.empty){

        content.innerHTML = "Nobody here yet.";

        return;

    }

    for(const followDoc of snapshot.docs){

        const userID = followDoc.id;

        const userSnap = await getDoc(
            doc(db,"users",userID)
        );

        if(!userSnap.exists()) continue;

        const data = userSnap.data();

        content.innerHTML += `

            <div
                class="follow-user"
                onclick="openUserProfile('${userID}')"
                style="cursor:pointer;"
            >

                <img
                    class="comment-profile-picture"
                    src="${data.profilePic || 'https://placehold.co/50x50?text=TFY'}"
                >

                <b>${data.username || "TFY Athlete"}</b>

            </div>

        `;

    }

};

window.closeFollowList = function(){

    const list =
        document.getElementById("followList");

    if(list){

        list.style.display = "none";

    }

};







// ============================
// PROFILE IMAGE PREVIEW
// (Storage will be added later)
// ============================


const profileUpload =
document.getElementById("profileUpload");



if(profileUpload){


profileUpload.addEventListener(

"change",

function(){


const file=this.files[0];



if(file){


const image =
document.getElementById(
"profileImage"
);



if(image){


image.src =
URL.createObjectURL(file);


}


}


}


);


}



// ============================
// CREATE POST FOUNDATION
// ============================


async function createPost(){

const videoOK = await checkVideoUpload();

if(!videoOK){
    return;
}

if(!currentUser){

alert(
"Login to create posts"
);

return;

}


const caption =
document.getElementById(
"postCaption"
).value;


const videoInput =
document.getElementById("videoUpload");

const videoFile =
videoInput.files[0];

let videoURL = null;

if(videoFile){

    const videoRef = ref(
        storage,
        `posts/${currentUser.uid}/${Date.now()}_${videoFile.name}`
    );

    const snapshot =
        await uploadBytes(videoRef, videoFile);

    videoURL =
        await getDownloadURL(snapshot.ref);
}

if(!caption){

alert(
"Write something first"
);

return;

}


 await addDoc(collection(db,"posts"),{
    userID: currentUser.uid,
    username: player.username,
    caption: caption,
    mediaURL: videoURL,
    likes: 0,
    likedBy: [],
    createdAt: serverTimestamp()
});


alert(
"Workout posted"
);


document.getElementById(
"postCaption"
).value="";


closePost();

}






// ============================
// START APP
// ============================


window.addEventListener("load", () => {

    openPage("home");

    hideLoading();

});

// ============================
// LOADING SCREEN
// ============================

function hideLoading(){

const loading =
document.getElementById(
"loadingScreen"
);

if(loading){

loading.style.display="none";

}

}



// ============================
// ADMIN DASHBOARD
// ============================

window.loadAdminReports = async function(){

    if(!currentUser){

        alert("Admin login required.");

        return;

    }

    const adminReports =
        document.getElementById("adminReports");

    if(!adminReports) return;

    try{

        const q = query(
            collection(db,"reports"),
            orderBy("createdAt","desc")
        );

        const snapshot =
            await getDocs(q);

        adminReports.innerHTML = "";

        if(snapshot.empty){

            adminReports.innerHTML =
                "<p>No reports.</p>";

            return;

        }

        snapshot.forEach(report => {

            const data = report.data();

            adminReports.innerHTML += `

                <div class="card admin-report">

                    <h3>
                        ⚠️ ${data.type || "Report"}
                    </h3>

                    <p>
                        Reason:
                        ${data.reason || "No reason"}
                    </p>

                    <p>
                        Report ID:
                        ${report.id}
                    </p>

                    <p>
                        Status:
                        ${data.status || "pending"}
                    </p>

                    ${
                        data.type === "post"
                        ?
                        `
                        <button
                            onclick="adminDeletePost('${data.postID}','${report.id}')"
                        >
                            🗑 Remove Post
                        </button>
                        `
                        :
                        ""
                    }

                    <button
                        onclick="adminResolveReport('${report.id}')"
                    >
                        ✓ Resolve
                    </button>

                </div>

            `;

        });

    }catch(error){

        console.error(
            "Admin reports error:",
            error
        );

        adminReports.innerHTML =
            "<p>Could not load reports.</p>";

    }

};




window.adminResolveReport = async function(
    reportID
){

    if(!currentUser) return;

    try{

        await updateDoc(
            doc(db,"reports",reportID),
            {
                status: "resolved",
                resolvedAt: serverTimestamp()
            }
        );

        loadAdminReports();

    }catch(error){

        console.error(
            "Resolve report error:",
            error
        );

        alert(
            "Could not resolve report."
        );

    }

};


async function checkAdmin(){

    if(!currentUser) return false;

    const tokenResult =
        await currentUser.getIdTokenResult();

    return tokenResult.claims.admin === true;

}








// ============================
// MAKE FUNCTIONS AVAILABLE
// TO HTML BUTTONS
// ============================


window.signup = signup;

window.login = login;

window.logout = logout;


window.openPage = openPage;


window.completeWorkout = completeWorkout;


window.updateProfile = updateProfile;


window.openPost = openPost;


window.closePost = closePost;


window.createPost = createPost;


console.log(typeof likePost);


console.log(typeof openComments);



// =====================================================
// ADMIN DASHBOARD
// =====================================================

async function isCurrentUserAdmin(){

    if(!currentUser){
        return false;
    }

    try{

        const tokenResult =
            await currentUser.getIdTokenResult();

        return tokenResult.claims.admin === true;

    }catch(error){

        console.error(
            "Admin check failed:",
            error
        );

        return false;

    }

}


// =====================================================
// SHOW ADMIN BUTTON
// =====================================================

async function setupAdmin(){

    const adminButton =
        document.getElementById("adminButton");

    if(!adminButton){

        console.log("ADMIN BUTTON NOT FOUND");

        return;

    }

    if(!currentUser){

        adminButton.style.display = "none";

        return;

    }

    try{

        const tokenResult =
            await currentUser.getIdTokenResult(true);

        

        if(tokenResult.claims.admin === true){

            adminButton.style.display = "block";

            console.log(
                "TFY ADMIN ACCESS ENABLED"
            );

        }else{

            adminButton.style.display = "none";

            console.log(
                "TFY ADMIN ACCESS NOT FOUND"
            );

        }

    }catch(error){

        console.error(
            "Admin check failed:",
            error
        );

        adminButton.style.display = "none";

    }

}


// =====================================================
// OPEN ADMIN PAGE
// =====================================================

window.openAdmin = async function(){

    const admin =
        await isCurrentUserAdmin();

    if(!admin){

        alert("Admin access required.");

        return;

    }

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove("active");

        });

    const adminPage =
        document.getElementById("admin");

    if(adminPage){

        adminPage.classList.add("active");

    }

    loadAdminReports();

};


// =====================================================
// LOAD REPORTS
// =====================================================

window.loadAdminReports = async function(){

    const admin =
        await isCurrentUserAdmin();

    if(!admin){

        alert("Admin access required.");

        return;

    }

    const box =
        document.getElementById("adminReports");

    if(!box){
        return;
    }

    box.innerHTML =
        "<p>Loading reports...</p>";

    try{

        const q = query(
            collection(db,"reports"),
            orderBy("createdAt","desc")
        );

        const snapshot =
            await getDocs(q);

        box.innerHTML = "";

        if(snapshot.empty){

            box.innerHTML =
                "<p>No reports.</p>";

            return;

        }

        snapshot.forEach(report => {

            const data =
                report.data();

            const reportID =
                report.id;

            box.innerHTML += `

                <div class="card admin-report">

                    <h3>
                        ⚠️ ${data.type || "Report"}
                    </h3>

                    <p>
                        <strong>Reason:</strong>
                        ${data.reason || "No reason"}
                    </p>

                    <p>
                        <strong>Reported by:</strong>
                        ${data.reporterUsername || "Unknown"}
                    </p>

                    <p>
                        <strong>Post ID:</strong>
                        ${data.postID || "None"}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${data.status || "pending"}
                    </p>

                    ${
                        data.type === "post"
                        ?
                        `
                        <button
                            onclick="adminDeletePost(
                                '${data.postID}',
                                '${reportID}'
                            )"
                        >
                            🗑 DELETE POST
                        </button>
                        `
                        :
                        ""
                    }

                    <button
                        onclick="adminResolveReport('${reportID}')"
                    >
                        ✓ RESOLVE
                    </button>

                </div>

            `;

        });

    }catch(error){

        console.error(
            "Could not load reports:",
            error
        );

        box.innerHTML =
            "<p>Could not load reports.</p>";

    }

};


// =====================================================
// DELETE POST
// =====================================================

window.adminDeletePost = async function(
    postID,
    reportID
){

    const admin =
        await isCurrentUserAdmin();

    if(!admin){

        alert("Admin access required.");

        return;

    }

    if(!postID){
        return;
    }

    const confirmed =
        confirm(
            "Delete this post permanently?"
        );

    if(!confirmed){
        return;
    }

    try{

        await deleteDoc(
            doc(db,"posts",postID)
        );

        if(reportID){

            await updateDoc(
                doc(db,"reports",reportID),
                {
                    status: "resolved",
                    action: "post_deleted",
                    resolvedAt:
                        serverTimestamp()
                }
            );

        }

        alert("Post deleted.");

        loadAdminReports();

    }catch(error){

        console.error(
            "Admin delete post error:",
            error
        );

        alert(
            "Could not delete post."
        );

    }

};


// =====================================================
// RESOLVE REPORT
// =====================================================

window.adminResolveReport = async function(
    reportID
){

    const admin =
        await isCurrentUserAdmin();

    if(!admin){

        alert("Admin access required.");

        return;

    }

    try{

        await updateDoc(
            doc(db,"reports",reportID),
            {
                status: "resolved",
                resolvedAt:
                    serverTimestamp()
            }
        );

        loadAdminReports();

    }catch(error){

        console.error(
            "Resolve report error:",
            error
        );

        alert(
            "Could not resolve report."
        );

    }

};


// =====================================================
// ADMIN SEARCH
// =====================================================

window.adminSearch = async function(){

    const admin =
        await isCurrentUserAdmin();

    if(!admin){

        alert("Admin access required.");

        return;

    }

    const input =
        document.getElementById(
            "adminSearchInput"
        );

    const results =
        document.getElementById(
            "adminSearchResults"
        );

    if(!input || !results){
        return;
    }

    const searchText =
        input.value.trim().toLowerCase();

    if(!searchText){

        results.innerHTML =
            "<p>Enter something to search.</p>";

        return;

    }

    results.innerHTML =
        "<p>Searching...</p>";

    try{

        const usersSnapshot =
            await getDocs(
                query(
                    collection(db,"users"),
                    limit(100)
                )
            );

        const postsSnapshot =
            await getDocs(
                query(
                    collection(db,"posts"),
                    limit(100)
                )
            );

        const commentsSnapshot =
            await getDocs(
                query(
                    collection(db,"comments"),
                    limit(100)
                )
            );

        results.innerHTML = "";

        let found = false;


        // ==========================
        // USERS
        // ==========================

        usersSnapshot.forEach(userDoc => {

            const data =
                userDoc.data();

            const username =
                (data.username || "")
                .toLowerCase();

            if(
                username.includes(searchText)
            ){

                found = true;

                results.innerHTML += `

                    <div class="card admin-result">

                        <h3>
                            👤 ${data.username || "User"}
                        </h3>

                        <p>
                            User ID:
                            ${userDoc.id}
                        </p>

                        <button
                            onclick="openUserProfile('${userDoc.id}')"
                        >
                            VIEW PROFILE
                        </button>

                    </div>

                `;

            }

        });


        // ==========================
        // POSTS
        // ==========================

        postsSnapshot.forEach(postDoc => {

            const data =
                postDoc.data();

            const caption =
                (data.caption || "")
                .toLowerCase();

            const username =
                (data.username || "")
                .toLowerCase();

            if(
                caption.includes(searchText) ||
                username.includes(searchText)
            ){

                found = true;

                results.innerHTML += `

                    <div class="card admin-result">

                        <h3>
                            📝 Post by
                            ${data.username || "User"}
                        </h3>

                        <p>
                            ${data.caption || ""}
                        </p>

                        <p>
                            Post ID:
                            ${postDoc.id}
                        </p>

                        <button
                            onclick="adminSearchDeletePost('${postDoc.id}')"
                        >
                            🗑 DELETE POST
                        </button>

                    </div>

                `;

            }

        });


        // ==========================
        // COMMENTS
        // ==========================

        commentsSnapshot.forEach(commentDoc => {

            const data =
                commentDoc.data();

            const text =
                (data.text || "")
                .toLowerCase();

            const username =
                (data.username || "")
                .toLowerCase();

            if(
                text.includes(searchText) ||
                username.includes(searchText)
            ){

                found = true;

                results.innerHTML += `

                    <div class="card admin-result">

                        <h3>
                            💬 Comment by
                            ${data.username || "User"}
                        </h3>

                        <p>
                            ${data.text || ""}
                        </p>

                        <button
                            onclick="adminDeleteComment('${commentDoc.id}')"
                        >
                            🗑 DELETE COMMENT
                        </button>

                    </div>

                `;

            }

        });


        if(!found){

            results.innerHTML =
                "<p>No results found.</p>";

        }

    }catch(error){

        console.error(
            "Admin search error:",
            error
        );

        results.innerHTML =
            "<p>Search failed.</p>";

    }

};


// =====================================================
// DELETE SEARCHED POST
// =====================================================

window.adminSearchDeletePost =
async function(postID){

    const admin =
        await isCurrentUserAdmin();

    if(!admin){
        alert("Admin access required.");
        return;
    }

    if(
        !confirm(
            "Delete this post permanently?"
        )
    ){

        return;

    }

    try{

        await deleteDoc(
            doc(db,"posts",postID)
        );

        alert("Post deleted.");

        adminSearch();

    }catch(error){

        console.error(error);

        alert(
            "Could not delete post."
        );

    }

};


// =====================================================
// DELETE COMMENT
// =====================================================

window.adminDeleteComment =
async function(commentID){

    const admin =
        await isCurrentUserAdmin();

    if(!admin){
        alert("Admin access required.");
        return;
    }

    if(
        !confirm(
            "Delete this comment permanently?"
        )
    ){

        return;

    }

    try{

        await deleteDoc(
            doc(db,"comments",commentID)
        );

        alert("Comment deleted.");

        adminSearch();

    }catch(error){

        console.error(error);

        alert(
            "Could not delete comment."
        );

    }

};

