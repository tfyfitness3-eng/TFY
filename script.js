// ============================
// TFY DATA SYSTEM
// ============================


let player = JSON.parse(
localStorage.getItem("TFYplayer")
) || {

name:"Ethan",

xp:0,

level:1,

streak:0,

lastWorkout:null

};



let posts = JSON.parse(
localStorage.getItem("TFYposts")
) || [];



let selectedType = "";




// ============================
// NAVIGATION
// ============================


function openPage(page){


document.querySelectorAll(".page")
.forEach(function(p){

p.classList.remove("active");

});



document
.getElementById(page)
.classList.add("active");



document.querySelectorAll(".tabs button")
.forEach(function(tab){

tab.classList.remove("active");

});



let tab =
document.getElementById(page+"Tab");


if(tab){

tab.classList.add("active");

}


}






// ============================
// WORKOUT SYSTEM
// ============================


function completeWorkout(){


let today =
new Date().toDateString();



if(player.lastWorkout === today){

alert("Today's mission is already complete 🔥");

return;

}



player.xp +=50;

player.streak++;

player.lastWorkout=today;


checkLevel();

savePlayer();

update();



alert("+50 XP Earned 💪");


}







function checkLevel(){


let needed =
player.level * 100;



if(player.xp >= needed){


player.xp -= needed;

player.level++;


alert(
"LEVEL UP 🔥 Level "
+player.level
);


}


}






function savePlayer(){


localStorage.setItem(

"TFYplayer",

JSON.stringify(player)

);


}







// ============================
// CREATE POST
// ============================


function openPost(){


document.getElementById("postPopup")
.style.display="flex";


}



function closePost(){


document.getElementById("postPopup")
.style.display="none";


}




function selectType(type){


selectedType=type;


}






function createPost(){



let caption =
document.getElementById("postCaption")
.value;



let video =
document.getElementById("videoUpload")
.files[0];



if(!video){

alert("Upload a workout video 🔥");

return;

}



let videoURL =
URL.createObjectURL(video);




let newPost={


id:Date.now(),


user:player.name,


type:selectedType || "🏋 Workout",


caption:caption,


video:videoURL,


likes:0,


comments:[]


};




posts.unshift(newPost);



savePosts();


displayPosts();



document.getElementById("postCaption")
.value="";


document.getElementById("videoUpload")
.value="";



closePost();


}








// ============================
// SAVE POSTS
// ============================


function savePosts(){


localStorage.setItem(

"TFYposts",

JSON.stringify(posts)

);


}







// ============================
// TIKTOK STYLE FEED
// ============================


function displayPosts(){



let feed =
document.getElementById("videoFeed");



if(!feed)return;



feed.innerHTML="";





posts.forEach(function(post){



let div =
document.createElement("div");



div.className="video-post";



div.innerHTML=`


<video

src="${post.video}"

loop

playsinline

onclick="toggleVideo(this)">

</video>




<div class="video-info">


<h3>

🔥 ${post.user}

</h3>


<p>

${post.type}

</p>


<p>

${post.caption}

</p>



</div>




<div class="video-actions">



<button onclick="likePost(${post.id})">

❤️

<br>

${post.likes}

</button>



<button onclick="commentPost(${post.id})">

💬

<br>

${post.comments.length}

</button>



</div>


`;



feed.appendChild(div);



});



}




// ============================
// VIDEO CONTROLS
// ============================


function toggleVideo(video){


if(video.paused){

video.play();

}

else{

video.pause();

}


}








// ============================
// LIKES
// ============================


function likePost(id){



let post =
posts.find(function(p){

return p.id===id;

});



if(post){


post.likes++;


savePosts();


displayPosts();


}


}







// ============================
// COMMENTS
// ============================


function commentPost(id){


let text =
prompt("Write a comment:");



if(!text)return;



let post =
posts.find(function(p){

return p.id===id;

});



if(post){


post.comments.push(text);



savePosts();



displayPosts();


}



}







// ============================
// UPDATE DISPLAY
// ============================


function update(){


document.getElementById("xp")
.innerHTML =
player.xp;



document.getElementById("level")
.innerHTML =
player.level;



document.getElementById("streak")
.innerHTML =
player.streak;



let profile =
document.getElementById("profileLevel");



if(profile){

profile.innerHTML =
player.level;

}


}






// ============================
// START
// ============================


displayPosts();


update();


openPage("home");