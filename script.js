// ============================
// TFY V2 FIREBASE IMPORTS
// ============================

import { auth, db } from "./firebase.js";


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


achievements:[]


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

  onAuthStateChanged(auth, (user)=>{

if(user){
currentUser = user;
loadProfile();
}
else{
currentUser = null;
}

updateUI();

loadLeaderboard();

loadFeed();

hideLoading();

loadProfilePosts();

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



currentUser=result.user;



player.username=username;



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


player = {

...player,

...snap.data()

};


updateUI();


}

else{


saveProfile();


}


});


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







function displayChallenge(){


const box =
document.getElementById("dailyChallenge");



if(!box)

return;



const challenge =
getDailyChallenge();



box.innerHTML="";



challenge.workouts.forEach(item=>{


box.innerHTML += `


<div class="exercise">


${item[0]}


<b>

${item[1]}

</b>


</div>


`;


});


}







// ============================
// COMPLETE WORKOUT
// ============================


async function completeWorkout(){



if(!currentUser){


document.getElementById("authPopup").style.display="flex";


return;


}



let today =

new Date().toDateString();





if(player.lastWorkout === today){


alert(

"You already completed today's challenge"

);


return;


}







// CHECK STREAK


if(player.lastWorkout){


let last =

new Date(player.lastWorkout);



let current =

new Date();



let difference =

Math.floor(

(current-last)/(1000*60*60*24)

);



if(difference === 1){


player.streak++;


}


else if(difference > 1){


player.streak=1;


}



}

else{


player.streak=1;


}






player.lastWorkout=today;


player.totalWorkouts++;





// BASE XP


await addXP(50);





// STREAK REWARDS


checkStreakRewards();





alert(

" +50 XP Earned!"

);





await saveProfile();


}







// ============================
// STREAK REWARDS
// ============================


function checkStreakRewards(){


let rewards = {


3:100,


7:250,


14:500,


30:1000,


60:2500,


100:5000


};





let reward =

rewards[player.streak];





if(reward){


player.xp += reward;



unlockAchievement(

player.streak + " Day Streak",

"Stayed consistent for " +

player.streak +

" days "

);




alert(

" STREAK REWARD!\n+" +

reward +

" XP"

);



}


}








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


🏆 ${a.title}

<br>

<small>

${a.description}

</small>


</div>


`;



});



});



}

// ============================
// UPDATE UI
// ============================


function updateUI(){


const elements = {


homeUsername:
player.username,


 xp:
player.totalXP,


homeLevel:
player.level,


streak:
player.streak,


profileUsername:
player.username,


 profileXP:
player.totalXP,


profileLevel:
player.level,


profileStreak:
player.streak,


workouts:
player.totalWorkouts,


followers:
player.followers,


following:
player.following


};




Object.keys(elements).forEach(id=>{


const element =
document.getElementById(id);



if(element){

element.innerText =
elements[id];

}


});





// XP BAR


const xpBar =
document.getElementById("xpBar");



const needed =
player.level * 100;



if(xpBar){


xpBar.style.width =

Math.min(

(player.xp / needed) * 100,

100

)

+ "%";


}







const xpText =
document.getElementById("xpText");



if(xpText){


xpText.innerText =

player.xp +

" / " +

needed +

" XP";


}







// STREAK BAR


const streakBar =
document.getElementById("streakBar");



if(streakBar){


streakBar.style.width =

Math.min(

(player.streak / 3) * 100,

100

)

+ "%";


}



const streakText =
document.getElementById("streakText");



if(streakText){


streakText.innerText =

player.streak +

" / 3 Days";


}




updateAchievements();


displayChallenge();


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

"Profile saved 🔥"

);


}








// ============================
// LEADERBOARD
// ============================


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
src="${data.profilePic || 'https://placehold.co/80x80?text=TFY'}"
class="rank-profile-picture"
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


<button onclick="likePost('${post.id}')">
❤️ ${data.likes || 0}
</button>


 <button onclick="openComments('${post.id}')">
💬 Comment
</button>


<button onclick="sharePost('${data.caption}', '${post.id}')">
↗ Share
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

    const postRef = doc(db,"posts",postID);

const postSnap = await getDoc(postRef);

if(!postSnap.exists()) return;

const postData = postSnap.data();

const likedBy = postData.likedBy || [];

const alreadyLiked = likedBy.includes(currentUser.uid);

if(alreadyLiked){

await updateDoc(postRef,{
likes: increment(-1),
likedBy: arrayRemove(currentUser.uid)
});

await updateDoc(
doc(db,"users",postData.userID),
{
xp: increment(-1),
totalXP: increment(-1)
}
);

}else{

await updateDoc(postRef,{
likes: increment(1),
likedBy: arrayUnion(currentUser.uid)
});

await updateDoc(
doc(db,"users",postData.userID),
{
xp: increment(1),
totalXP: increment(1)
}
);

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


window.addEventListener(
"load",
()=>{


openPage("home");


hideLoading();


}
);


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
