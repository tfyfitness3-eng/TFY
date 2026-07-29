// ============================
// FIREBASE IMPORTS
// ============================

import { auth, db, storage } from "./firebase.js";

import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
onAuthStateChanged,
signOut
}
from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


import {
doc,
setDoc,
getDoc,
collection,
query,
orderBy,
limit,
getDocs
}
from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


import {
ref,
uploadBytes,
getDownloadURL
}
from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";



// ============================
// GLOBAL STATE
// ============================

let currentUser = null;


let player = {

username:"Guest",

name:"Guest",

bio:"",

profilePic:"",

xp:0,

level:1,

streak:0,

lastWorkout:null,

totalWorkouts:0,

followers:[],

following:[]

};



// ============================
// AUTH LISTENER
// ============================


onAuthStateChanged(auth, async(user)=>{


if(user){

currentUser=user;

await loadProfile();

document.getElementById("authPopup").style.display="none";


}else{


currentUser=null;


}


updateUI();

loadLeaderboard();


});




// ============================
// SIGN UP
// ============================


async function signup(){


const username =
document.getElementById("signupName").value;


const email =
document.getElementById("signupEmail").value;


const password =
document.getElementById("signupPassword").value;



if(!username || !email || !password){

alert("Fill everything");

return;

}



try{


const result =
await createUserWithEmailAndPassword(
auth,
email,
password
);



const user=result.user;



await setDoc(
doc(db,"users",user.uid),
{

username,

name:username,

bio:"",

profilePic:"",

xp:0,

level:1,

streak:0,

lastWorkout:null,

totalWorkouts:0,

followers:[],

following:[],

createdAt:Date.now()

}

);



alert("Welcome to TFY 🔥");


}

catch(error){

alert(error.message);

}


}




// ============================
// LOGIN
// ============================


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


}

catch(error){

alert(error.message);

}


}




// ============================
// LOGOUT
// ============================


function logout(){

signOut(auth);

}




// ============================
// PROFILE LOAD
// ============================


async function loadProfile(){


if(!currentUser)return;



const snap =
await getDoc(
doc(db,"users",currentUser.uid)
);



if(snap.exists()){


player={

...player,

...snap.data()

};


}



}



// ============================
// SAVE PROFILE
// ============================


async function saveProfile(){


if(!currentUser)return;


await setDoc(

doc(db,"users",currentUser.uid),

player,

{
merge:true
}

);


}



// ============================
// PROFILE UPDATE
// ============================


async function updateProfile(){


if(!currentUser){

alert("Login first");

return;

}



const bio =
document.getElementById("bioInput");



if(bio){

player.bio=bio.value;

}



const file =
document.getElementById("profileUpload").files[0];



if(file){


const imageRef =
ref(
storage,
"profilePictures/"+currentUser.uid
);



await uploadBytes(
imageRef,
file
);



player.profilePic =
await getDownloadURL(imageRef);


}



await saveProfile();


updateUI();


alert("Profile Saved 🔥");


}



// ============================
// UI UPDATE
// ============================


function updateUI(){



document.querySelectorAll("#username")
.forEach(el=>{

el.innerText=player.username;

});



document.querySelectorAll("#xp")
.forEach(el=>{

el.innerText=player.xp;

});



document.querySelectorAll("#profileXP")
.forEach(el=>{

el.innerText=player.xp;

});



document.querySelectorAll("#profileLevel")
.forEach(el=>{

el.innerText=player.level;

});



document.querySelectorAll("#homeLevel")
.forEach(el=>{

el.innerText=player.level;

});



document.querySelectorAll("#streak")
.forEach(el=>{

el.innerText=player.streak;

});



document.querySelectorAll("#profileStreak")
.forEach(el=>{

el.innerText=player.streak;

});



const bio =
document.getElementById("bioInput");


if(bio){

bio.value=player.bio || "";

}



const img =
document.getElementById("profileImage");


if(img && player.profilePic){

img.src=player.profilePic;

}


}




// ============================
// NAVIGATION
// ============================


function openPage(page){


document.querySelectorAll(".page")
.forEach(section=>{

section.classList.remove("active");

});



const selected =
document.getElementById(page);


if(selected){

selected.classList.add("active");

}



document.querySelectorAll(".tabs button")
.forEach(btn=>{

btn.classList.remove("active");

});



const tab =
document.getElementById(page+"Tab");


if(tab){

tab.classList.add("active");

}


}




// ============================
// XP SYSTEM
// ============================


function addXP(amount){


player.xp += amount;


checkLevel();


saveProfile();


updateUI();


}



function checkLevel(){


let needed =
player.level * 100;



while(player.xp >= needed){


player.xp -= needed;


player.level++;


alert(
"LEVEL UP 🔥 Level "+player.level
);


needed =
player.level * 100;


}


}




// ============================
// DAILY WORKOUT
// ============================


async function completeWorkout(){


if(!currentUser){


document.getElementById("authPopup").style.display="flex";

return;


}



let today =
new Date().toDateString();



if(player.lastWorkout===today){

alert("Already completed today 💪");

return;

}



player.lastWorkout=today;

player.streak++;

player.totalWorkouts++;


addXP(50);



alert("+50 XP Earned 🔥");


}





// ============================
// LEADERBOARD
// ============================


async function loadLeaderboard(){


const board =
document.getElementById("leaderboard");



if(!board)return;



try{


const q=query(

collection(db,"users"),

orderBy(
"xp",
"desc"
),

limit(10)

);



const snap =
await getDocs(q);



board.innerHTML="";



let rank=1;



snap.forEach(user=>{


const data=user.data();



board.innerHTML += `

<div class="card rank">

🏆 #${rank}

<br>

<b>${data.username}</b>

<br>

${data.xp} XP

</div>

`;


rank++;


});



}

catch(error){

console.log(error);

}



}




// ============================
// POST SYSTEM PLACEHOLDERS
// ============================


function openPost(){

document.getElementById("postPopup").style.display="flex";

}


function closePost(){

document.getElementById("postPopup").style.display="none";

}



async function createPost(){


alert("Video posting system next: Firestore + Storage");


}



// ============================
// START APP
// ============================


openPage("home");



// ============================
// GLOBAL BUTTON CONNECTIONS
// ============================


window.signup=signup;

window.login=login;

window.logout=logout;

window.openPage=openPage;

window.completeWorkout=completeWorkout;

window.updateProfile=updateProfile;

window.openPost=openPost;

window.closePost=closePost;

window.createPost=createPost;
