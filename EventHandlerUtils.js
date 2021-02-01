/**
 * Camera Controls Section
 * TO DO: make a new class/file to make code
 * more readable and modular
 */

/**
 * Note:
 * f: view/front direction
 * s: perpendicular/right side direction
 * u: the up vector orthogonal to f, s
 */


function EventHandler()
{
    console.log("Event Handler Function initialized");
}

EventHandler.prototype.calcDirectionVectors = function()
{
    console.log("calcDirectionVectors called");

    fx = centerX - eyeX;
    fy = centerY - eyeY;
    fz = centerZ - eyeZ;
  
    // Normalize f.
    var rlf = 1 / Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx *= rlf;
    fy *= rlf;
    fz *= rlf;
  
    // Calculate cross product of f and up.
    sx = fy * upZ - fz * upY;
    sy = fz * upX - fx * upZ;
    sz = fx * upY - fy * upX;
  
    // Normalize s.
    var rls = 1 / Math.sqrt(sx*sx + sy*sy + sz*sz);
    sx *= rls;
    sy *= rls;
    sz *= rls;

    // Calculate cross product of s and f -> get the new up-vector
    uX = sy * fz - sz * fy;
    uY = sz * fx - sx * fz;
    uZ = sx * fy - sy * fx;

    console.log("ORIG: centerX: %f, centerY: %f, centerZ: %f", centerX, centerY, centerZ);

    console.log("ORIG fx: %f, fy: %f, fz: %f", fx, fy, fz);
    console.log("ORIG sx: %f, sy: %f, sz: %f", sx, sy, sz);
}

EventHandler.prototype.moveCameraInOut = function(displDelta)
{
    fx = centerX - eyeX;
    fy = centerY - eyeY;
    fz = centerZ - eyeZ;
  
    // Normalize f.
    var rlf = 1 / Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx *= rlf;
    fy *= rlf;
    fz *= rlf;

    centerX += displDelta*fx;
    centerY += displDelta*fy;
    centerZ += displDelta*fz;

    eyeX += displDelta*fx;
    eyeY += displDelta*fy;
    eyeZ += displDelta*fz;

}

EventHandler.prototype.moveCameraSideways = function(displDelta)
{
    var fx = centerX - eyeX
    var fy = centerY - eyeY;
    var fz = centerZ - eyeZ;
  
    // Normalize f.
    var rlf = 1 / Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx *= rlf;
    fy *= rlf;
    fz *= rlf;
  
    // Calculate cross product of f and up.
    sx = fy * upZ - fz * upY;
    sy = fz * upX - fx * upZ;
    sz = fx * upY - fy * upX;

    centerX += displDelta*sx;
    centerY += displDelta*sy;
    centerZ += displDelta*sz;

    eyeX += displDelta*sx;
    eyeY += displDelta*sy;
    eyeZ += displDelta*sz;
}

EventHandler.prototype.moveCameraFront = function()
{
    console.log("moveCameraFront() called");

    this.moveCameraInOut(distChange);
}

EventHandler.prototype.moveCameraBack = function()
{
    console.log("moveCameraBack() called");

    this.moveCameraInOut(-distChange);
}

EventHandler.prototype.moveCameraRight = function()
{
    console.log("moveCameraRight() called");

    this.moveCameraSideways(distChange);
}

EventHandler.prototype.moveCameraLeft = function()
{
    console.log("moveCameraLeft() called");

    this.moveCameraSideways(-distChange);
}

EventHandler.prototype.tiltCameraVertically = function(thetaDelta)
{
    var theta = thetaDelta;

    fx = centerX - eyeX;
    fy = centerY - eyeY;
    fz = centerZ - eyeZ;
  
    // Normalize f.
    var rlf = 1 / Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx *= rlf;
    fy *= rlf;
    fz *= rlf;
  
    // s direction will remain same, so it is not changed

    // Calculate cross product of s and f -> get the new "orthogonal" up-vector 
    uX = sy * fz - sz * fy;
    uY = sz * fx - sx * fz;
    uZ = sx * fy - sy * fx;

    console.log("BEFORE centerX: %f, centerY: %f, centerZ: %f", centerX, centerY, centerZ);

    console.log("fx: %f, fy: %f, fz: %f", fx, fy, fz);
    console.log("sx: %f, sy: %f, sz: %f", sx, sy, sz);

    var Lx = centerX - eyeX;
    var Ly = centerY - eyeY;
    var Lz = centerZ - eyeZ; 
    var L = Math.sqrt(Lx*Lx + Ly*Ly + Lz*Lz);
    console.log("L: %f", L);
    console.log("Math.cos(%d): %f", (theta*180)/(Math.PI), Math.cos(theta));
    console.log("Math.sin(%d): %f", (theta*180)/(Math.PI), Math.sin(theta));

    centerX = eyeX + L * (Math.cos(theta)*fx + Math.sin(theta)*uX);
    centerY = eyeY + L * (Math.cos(theta)*fy + Math.sin(theta)*uY);
    centerZ = eyeZ + L * (Math.cos(theta)*fz + Math.sin(theta)*uZ);
    console.log("eyeZ: %f", eyeZ);
    console.log("AFTER centerX: %f, centerY: %f, centerZ: %f", centerX, centerY, centerZ);

}

EventHandler.prototype.tiltCameraSideways = function(thetaDelta)
{
    var theta = Math.PI/2.0 + thetaDelta;

    var fx = centerX - eyeX;
    var fy = centerY - eyeY;
    var fz = centerZ - eyeZ;
  
    // Normalize f.
    var rlf = 1 / Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx *= rlf;
    fy *= rlf;
    fz *= rlf;
  
    // Calculate cross product of f and up.
    sx = fy * upZ - fz * upY;
    sy = fz * upX - fx * upZ;
    sz = fx * upY - fy * upX;
  
    // Normalize s.
    var rls = 1 / Math.sqrt(sx*sx + sy*sy + sz*sz);
    sx *= rls;
    sy *= rls;
    sz *= rls;

    // u direction will remain same so it is not changed

    console.log("fx: %f, fy: %f, fz: %f", fx, fy, fz);
    console.log("sx: %f, sy: %f, sz: %f", sx, sy, sz);

    var Lx = centerX - eyeX;
    var Ly = centerY - eyeY;
    var Lz = centerZ - eyeZ; 
    var L = Math.sqrt(Lx*Lx + Ly*Ly + Lz*Lz);
    console.log("L: %f", L);
    console.log("Math.cos(%d): %f", (theta*180)/(Math.PI), Math.cos(theta));
    console.log("Math.sin(%d): %f", (theta*180)/(Math.PI), Math.sin(theta));

    centerX = eyeX + L * (Math.cos(theta)*sx + Math.sin(theta)*fx);
    centerY = eyeY + L * (Math.cos(theta)*sy + Math.sin(theta)*fy);
    // we are not changing Z value as that is in the direction of up vector

    console.log("eyeZ: %f", eyeZ);
    console.log("AFTER centerX: %f, centerY: %f, centerZ: %f", centerX, centerY, centerZ);
}

EventHandler.prototype.tiltCameraUp = function()
{
    console.log("tiltCameraUp() called");

    this.tiltCameraVertically(thetaChange);
}

EventHandler.prototype.tiltCameraDown = function()
{
    console.log("tiltCameraUp() called");

    this.tiltCameraVertically(-thetaChange);
}

EventHandler.prototype.tiltCameraLeft = function()
{
    console.log("tiltCameraLeft() called");

    this.tiltCameraSideways(thetaChange);
}

EventHandler.prototype.tiltCameraRight = function()
{
    console.log("tiltCameraRight() called");

    this.tiltCameraSideways(-thetaChange);
}