// Vertex shader for texture drawing
var TEXTURE_VSHADER_SOURCE =
'attribute vec4 a_Position;\n' +
'attribute vec4 a_Normal;\n' +
'attribute vec2 a_TexCoord;\n' +
'uniform mat4 u_MvpMatrix;\n' +
'uniform vec4 u_Eye;\n' +
'uniform mat4 u_ModelMatrix;\n' +    // Model matrix
'uniform mat4 u_NormalMatrix;\n' +
'varying vec2 v_TexCoord;\n' +
'varying float v_Dist;\n' +
'varying vec3 v_Normal;\n' +
'varying vec3 v_Position;\n' +
'void main() {\n' +
'  gl_Position = u_MvpMatrix * a_Position;\n' +
'  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
'  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
'  v_TexCoord = a_TexCoord;\n' +
'  v_Dist = distance(u_ModelMatrix * a_Position, u_Eye);\n' +
'}\n';

// Fragment shader for texture drawing
var TEXTURE_FSHADER_SOURCE =
'#ifdef GL_ES\n' +
'precision mediump float;\n' +
'#endif\n' +
'uniform sampler2D u_Sampler;\n' +
'uniform vec2 u_FogDist;\n' +  // Distance of Fog (starting point, end point)
'uniform float u_Alpha;\n' +
'uniform vec3 u_FogColor;\n' +
'varying vec2 v_TexCoord;\n' +
'varying vec3 v_Position;\n' +
'varying vec3 v_Normal;\n' +
'varying float v_Dist;\n' +
'void main() {\n' +
'  float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);\n' +
'  vec3 u_LightColor = vec3(1.3, 1.3, 1.3);\n' +
'  vec3 u_LightPosition = vec3(2.3, 4.0, 3.5);\n' +
'  vec3 u_AmbientLight = vec3(0.2, 0.2, 0.2);\n' +
'  vec3 normal = normalize(v_Normal);\n' +
'  vec3 lightDirection = normalize(u_LightPosition - v_Position);\n' +
'  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
'  vec4 color = texture2D(u_Sampler, v_TexCoord);\n' +
'  vec3 diffuse = u_LightColor * color.rgb * nDotL;\n' +
'  vec3 ambient = u_AmbientLight * color.rgb;\n' +
'  vec3 F_Color =  mix(u_FogColor, diffuse + ambient, fogFactor);\n' +
'  gl_FragColor = vec4(F_Color, u_Alpha);\n' +
'}\n';

  var projMatrix = new Matrix4();
  var viewMatrix = new Matrix4();
  var modelMatrix = new Matrix4().setIdentity();  // Model matrix
  var mvpMatrix = new Matrix4();    // Model view projection matrix
  var normalMatrix = new Matrix4(); // Transformation matrix for normals
  // Coordinate transformation matrix
  var g_modelMatrix = new Matrix4();
  var g_mvpMatrix = new Matrix4();
  var g_normalMatrix = new Matrix4();
  var currentAngle = [0.0, 0.0]; // Current rotation angle ([x-axis, y-axis] degrees)
  var lastMatrix = new Matrix4();
  var tempMatrix = new Matrix4();
  var changePerspective=false;
  var g_MvpMatrix = new Matrix4();
  var radius=15.0;
  var theta=60.0; // 视点（眼睛）绕X轴旋转角度，类似于球的极坐标θ值，
  var phi=30.0; // 视点（眼睛）绕y轴旋转角度，类似于球的极坐标φ值，
  var fov=30;

  var dragging = false;         // Dragging or not
  var transparent = false;      //是否选择开启透明
  var lastX = -1, lastY = -1;   // Last position of the mouse

  // Distance of fog [where fog starts, where fog completely covers object]
  var fogDist = new Float32Array([0, 35]);
  var alpha=1.0;

  var color= new Float32Array([1.0, 1.0 ,1.0]);
  var button =document.getElementById('button');
  var colorChange=document.querySelectorAll('.colorChange');

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // // Initialize shaders
  // if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
  //   console.log('Failed to intialize shaders.');
  //   return;
  // }
  var texProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);
  if (!texProgram) {
    console.log('Failed to intialize shaders.');
    return;
  }


// Get storage locations of attribute and uniform variables in program object for texture drawing
texProgram.a_Position = gl.getAttribLocation(texProgram, 'a_Position');
texProgram.a_Normal = gl.getAttribLocation(texProgram, 'a_Normal');
texProgram.a_TexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
texProgram.u_MvpMatrix = gl.getUniformLocation(texProgram, 'u_MvpMatrix');
texProgram.u_ModelMatrix = gl.getUniformLocation(texProgram, 'u_ModelMatrix');
texProgram.u_Eye = gl.getUniformLocation(texProgram, 'u_Eye');
texProgram.u_FogDist = gl.getUniformLocation(texProgram, 'u_FogDist');
texProgram.u_NormalMatrix = gl.getUniformLocation(texProgram, 'u_NormalMatrix');
texProgram.u_Sampler = gl.getUniformLocation(texProgram, 'u_Sampler');
texProgram.u_Alpha = gl.getUniformLocation(texProgram, 'u_Alpha');
texProgram.u_FogColor = gl.getUniformLocation(texProgram, 'u_FogColor');

  // 
  // Set the vertex information
  var cube = initVertexBuffers(gl);
  if (!cube) {
    console.log('Failed to set the vertex information');
    return;
  }
    // Set texture
    var texture = initTextures(gl, texProgram);
    if (!texture) {
      console.log('Failed to intialize the texture.');
      return;
    }

  // Set the clear color and enable the depth test
  gl.clearColor(color[0], color[1], color[2], 1.0);
  gl.enable(gl.DEPTH_TEST);

  // // Set blending function
  // gl.enable (gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  canvas.onmousedown = function(ev) {   // Mouse is pressed
    var x = ev.clientX, y = ev.clientY;
    // Start dragging if a moue is in <canvas>
    var rect = ev.target.getBoundingClientRect();
    if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
      lastX = x; lastY = y;
      dragging = true;
    }
  };

  canvas.onmouseup = function(ev) { 
    dragging = false;
    currentAngle=[0.0, 0.0];
    lastMatrix.set(tempMatrix);
  }; // Mouse is released

  canvas.onmousemove = function(ev) { // Mouse is moved
    if (dragging) {
      var x = ev.clientX, y = ev.clientY;
      var factor = 100/canvas.height; // The rotation ratio
      var dx = factor * (x - lastX);
      var dy = factor * (y - lastY);
      // Limit x-axis rotation angle to -90 to 90 degrees
      currentAngle[0] =currentAngle[0]+  dy;
      currentAngle[1] =currentAngle[1]+  dx;
      lastX = x, lastY = y;
      tick();
    }
  };
  document.addEventListener('keydown',function(e){
    console.log(e.code);
    if(e.code=='KeyC'||e.code=='KeyZ'||e.code=='KeyA'||e.code=='KeyD'||e.code=='KeyW'||e.code=='KeyE'||e.code=='KeyQ'||e.code=='Space'||e.code=='ArrowDown'||e.code=='ArrowUp'||e.code=='ArrowRight'||e.code=='ArrowLeft'){
      if(e.code=='Space'){
        if(changePerspective){
          projMatrix.setPerspective(fov, canvas.width/canvas.height, 1, 100);
        }
        else{
          projMatrix.setOrtho(-6.0, 6.0, -4.0, 4.0, 1.0, 100.0);
        }
        changePerspective=!changePerspective; 
      }
      if(e.code=='ArrowDown'){
        theta+=5;
      }
      if(e.code=='ArrowUp'){
        theta-=5;
      }
      if(e.code=='ArrowRight'){
        phi+=5;
      }
      if(e.code=='ArrowLeft'){
        phi-=5;
      } 
      if(e.code=='KeyE'){
        fogDist[1]  += 1;
      } 
      if(e.code=='KeyQ'){
        if (fogDist[1] > fogDist[0]) fogDist[1] -= 0.75;
      } 
      if(e.code=='KeyW'){
        transparent = !transparent;
        if(transparent){
          alpha=0.5;
          gl.disable(gl.DEPTH_TEST);
          gl.enable (gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        else{
          gl.enable(gl.DEPTH_TEST);
          gl.disable (gl.BLEND);
          alpha=1.0
        }
      } 
      if(e.code=='KeyA'){
        if(transparent){
          if(alpha<1){
            alpha+=0.1;
            if(Math.abs(alpha-1)<0.05){
              transparent = !transparent;
              gl.enable(gl.DEPTH_TEST);
              gl.disable (gl.BLEND);
              alpha=1.0
            }
          }
        }
      }
      if(e.code=='KeyD'){
        if(transparent){
          if(alpha>0){
            alpha-=0.1;
          }
        }
      }
      if(e.code=='KeyZ'){
        fov  += 10;
        if(!changePerspective){
          projMatrix.setPerspective(fov, canvas.width/canvas.height, 1, 100);
        }
      } 
      if(e.code=='KeyC'){
        fov  -= 10;
        if(!changePerspective){
          projMatrix.setPerspective(fov, canvas.width/canvas.height, 1, 100);
        }
      }
      setLook();
      tick();
    }


  })

  button.addEventListener('click',function(e){
    for(let n=0;n<3;n++){
      if(colorChange[n].value!=''){
        color[n] = ((colorChange[n].value)/256.0);
      }
      else{
        color[n] = 1;
      }
    }
    console.log(color);
    gl.clearColor(color[0], color[1], color[2], 1.0);
    tick();
  })

  var setLook=function(){
    viewMatrix.setLookAt(radius * Math.sin(radians(theta)) * Math.sin(radians(phi)),
    radius * Math.cos(radians(theta)),
    radius * Math.sin(radians(theta)) * Math.cos(radians(phi))
    ,0,0,0,
    radius * Math.sin(radians(theta - 90)) * Math.sin(radians(phi)),
      radius * Math.cos(radians(theta - 90)),
      radius * Math.sin(radians(theta - 90)) * Math.cos(radians(phi)));
  }

var init=function(){
  // Calculate the view projection matrix
  projMatrix.setPerspective(30, (canvas.width)/canvas.height, 1, 100);
  // mvpMatrix.setOrtho(-6.0, 6.0, -4.0, 4.0, 1.0, 100.0);
  setLook();

}
init();

// Start drawing
var tick = function() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
  // Draw a cube in single color
  // drawSolidCube(gl, solidProgram, cube);
  // Draw a cube with texture
  drawTexCube(gl, texProgram, cube, texture);
};
setTimeout(function () {
  tick();
}, 100);
}


function initVertexBuffers(gl) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  // Coordinates
  var vertices = new Float32Array([
     2.0, 2.0, 2.0,  -2.0, 2.0, 2.0,  -2.0,-2.0, 2.0,   2.0,-2.0, 2.0, // v0-v1-v2-v3 front
     2.0, 2.0, 2.0,   2.0,-2.0, 2.0,   2.0,-2.0,-2.0,   2.0, 2.0,-2.0, // v0-v3-v4-v5 right
     2.0, 2.0, 2.0,   2.0, 2.0,-2.0,  -2.0, 2.0,-2.0,  -2.0, 2.0, 2.0, // v0-v5-v6-v1 up
    -2.0, 2.0, 2.0,  -2.0, 2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0,-2.0, 2.0, // v1-v6-v7-v2 left
    -2.0,-2.0,-2.0,   2.0,-2.0,-2.0,   2.0,-2.0, 2.0,  -2.0,-2.0, 2.0, // v7-v4-v3-v2 down
     2.0,-2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0, 2.0,-2.0,   2.0, 2.0,-2.0  // v4-v7-v6-v5 back
  ]);


  // Normal
  var normals = new Float32Array([
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);

  var texCoords = new Float32Array([   // Texture coordinates
    1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v0-v1-v2-v3 front
    0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v0-v3-v4-v5 right
    1.0, 0.0,   1.0, 1.0,   0.0, 1.0,   0.0, 0.0,    // v0-v5-v6-v1 up
    1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v1-v6-v7-v2 left
    0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0,    // v7-v4-v3-v2 down
    0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0     // v4-v7-v6-v5 back
 ]);
 
  // Indices of the vertices
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
 ]);

 var o = new Object(); // Utilize Object to to return multiple buffer objects together

 // Write vertex information to buffer object
 o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
 o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
 o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
 o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
 if (!o.vertexBuffer || !o.normalBuffer || !o.texCoordBuffer || !o.indexBuffer) return null; 

 o.numIndices = indices.length;

 // Unbind the buffer object
 gl.bindBuffer(gl.ARRAY_BUFFER, null);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

 return o;
}

function radians(degrees){
  return degrees * Math.PI / 180.0;
}

function initTextures(gl, program) {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return null;
  }

  var image = new Image();  // Create a image object
  if (!image) {
    console.log('Failed to create the image object');
    return null;
  }
  // Register the event handler to be called when image loading is completed
  image.onload = function() {
    // Write the image data to texture object
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Pass the texure unit 0 to u_Sampler
    gl.useProgram(program);
    gl.uniform1i(program.u_Sampler, 0);

    gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
  };

  // Tell the browser to load an Image
  image.src = '../resources/dlam.jpg';

  return texture;
}

function drawTexCube(gl, program, o, texture) {
  gl.useProgram(program);   // Tell that this program object is used

  // Assign the buffer objects and enable the assignment
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);  // Vertex coordinates
  initAttributeVariable(gl, program.a_Normal, o.normalBuffer);    // Normal
  initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);// Texture coordinates
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer); // Bind indices

  gl.uniform2fv(program.u_FogDist, fogDist);   // Starting point and end point
  var eye = new Float32Array([radius * Math.sin(radians(theta)) * Math.sin(radians(phi)),
    radius * Math.cos(radians(theta)),
    radius * Math.sin(radians(theta)) * Math.cos(radians(phi)),1.0]);
  gl.uniform4fv(program.u_Eye, eye);           // Eye point
  gl.uniform1f(program.u_Alpha, alpha);
  gl.uniform3fv(program.u_FogColor, color);     
  // Bind texture object to texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  drawCube(gl, program, o); // Draw
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

function drawCube(gl, program, o, x, angle, viewProjMatrix) {
  // Calculate a model matrix
  tempMatrix.setRotate(currentAngle[0], 1.0, 0.0, 0.0); // Rotation around x-axis
  tempMatrix.rotate(currentAngle[1], 0.0, 1.0, 0.0); // Rotation around y-axis
  tempMatrix.multiply(lastMatrix);

  modelMatrix.set(tempMatrix);
  var temproMatrix=new Matrix4().set(projMatrix);
  mvpMatrix.set(temproMatrix.multiply(viewMatrix));
  g_MvpMatrix.set(mvpMatrix);
  g_MvpMatrix.multiply(modelMatrix);
  // Calculate the matrix to transform the normal based on the model matrix
  //  normalMatrix.setInverseOf(modelMatrix);
  //  normalMatrix.transpose();

  // g_modelMatrix.setTranslate(x, 0.0, 0.0);
  // g_modelMatrix.rotate(20.0, 1.0, 0.0, 0.0);
  // g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);

  // Calculate transformation matrix for normals and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

  // Calculate model view projection matrix and pass it to u_MvpMatrix
  // g_mvpMatrix.set(viewProjMatrix);
  // g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_MvpMatrix.elements);

  gl.uniformMatrix4fv(program.u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);   // Draw
}

function initArrayBufferForLaterUse(gl, data, num, type) {
  var buffer = gl.createBuffer();   // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Keep the information necessary to assign to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initElementArrayBufferForLaterUse(gl, data, type) {
  var buffer = gl.createBuffer();　  // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

  buffer.type = type;

  return buffer;
}