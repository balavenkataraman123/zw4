// we all love shaders eh?
console.log("shaders loaded.");

const vsSource = `
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;

void main() {
	gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
	vColor = aVertexColor;
}
`;
const fsSource = `
varying lowp vec4 vColor;

void main() {
	gl_FragColor = vColor;
}
`
const debugVS = `
uniform vec4 uColor;
uniform vec3 uPos1;
uniform vec3 uPos2;
varying lowp vec4 vColor;
attribute float aID;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
	vColor = uColor;
	vec4 pos1 = vec4(uPos1.xyz, 1.0);
	vec4 pos2 = vec4(uPos2.xyz, 1.0);
	if (aID == 0.0) {
		gl_Position = uProjectionMatrix * uModelViewMatrix * pos1;
	} else {
		gl_Position = uProjectionMatrix * uModelViewMatrix * pos2;
	}
}
`
const billboardVS = `
attribute vec4 aBillboardPos;

uniform mat4 uProjectionMatrix;
uniform mat4 ubModelViewMatrix;

varying lowp vec4 vColor;

void main() {
	gl_Position = uProjectionMatrix * ubModelViewMatrix * aBillboardPos;
	vColor = vec4(1.0, clamp(aBillboardPos.y * 10.0, 0.0, 1.0), 1.0, 1.0);
}
`
const textureVS = `
attribute vec4 aVertexPosition;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;

varying highp vec2 texCoord;
varying mediump float fogAmount;
varying highp vec3 vLighting;

void main() {
	gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
	texCoord = aTexCoord;/*
	if (uCameraPos.y < 0.0) {
		fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.08;
	} else {
		fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.05 - 1.0;
	}*/
	fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.05 - 1.0;
	vLighting = vec3(1.0, 1.0, 1.0);

}
`
const lightVS_t4 = `
attribute vec4 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTexCoord1;
attribute vec2 aTexCoord2;
attribute vec2 aTexCoord3;
attribute vec2 aTexCoord4;
attribute vec4 aMixFactor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;
uniform mat3 uLightingInfo; // 1st row is light direction, 2nd is color, 3rd is ambient light

varying highp vec2 texCoord1;
varying highp vec2 texCoord2;
varying highp vec2 texCoord3;
varying highp vec2 texCoord4;
varying highp vec4 mixFactor;
varying mediump float fogAmount;
varying highp vec3 vLighting;

void main() {
	gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
	texCoord1 = aTexCoord1;
	texCoord2 = aTexCoord2;
	texCoord3 = aTexCoord3;
	texCoord4 = aTexCoord4;
	mixFactor = aMixFactor;
	/*
	if (uCameraPos.y < 0.0 && false) {
		fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.08;
	} else {
		fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.05 - 1.0;
	}*/
	fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.05 - 0.3;
	highp float directional = clamp(dot(aVertexNormal, uLightingInfo[0]), 0.0, 1.5);
	vLighting = uLightingInfo[2] + (uLightingInfo[1] * directional * 0.65);
	float as = dot(aVertexNormal.xyz, vec3(1.0,0.0,0.0));
	// vLighting = vec3(as, as, as);
	gl_PointSize = 100.0;
}
`;
const lightVS = `
attribute vec4 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;
uniform mat3 uLightingInfo; // 1st row is light direction, 2nd is color, 3rd is ambient light

varying highp vec2 texCoord;
varying mediump float fogAmount;
varying highp vec3 vLighting;

void main() {
	gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
	texCoord = aTexCoord;
	fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.05 - 0.3;
	highp float directional = max(dot(aVertexNormal, uLightingInfo[0]), 0.0);
	vLighting = uLightingInfo[2] + (uLightingInfo[1] * directional * 0.65);
	float as = dot(aVertexNormal.xyz, vec3(1.0,0.0,0.0));
	// vLighting = vec3(as, as, as);
	gl_PointSize = 100.0;
}
`;
const lightColorVS = `
attribute vec4 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec4 aColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;
uniform mat3 uLightingInfo; // 1st row is light direction, 2nd is color, 3rd is ambient light
uniform vec4 uFogColor;
uniform float uFogAmount;

varying lowp vec4 vColor;

void main() {
	gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

	if (uCameraPos.y < 0.0) {
		float a = -(uModelViewMatrix * aVertexPosition).z * 0.08;
	}
	mediump float fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.05 - 0.3;
	highp vec4 transformedNormal = vec4(aVertexNormal, 1.0);
	highp float directional = max(dot(transformedNormal.xyz, uLightingInfo[0]), 0.0);
	highp vec3 vLighting = uLightingInfo[2] + (uLightingInfo[1] * directional * 0.65);
	vColor = vec4(aColor.rgb * vLighting, aColor.a); // I really should mix it in the frag shader, but I'm trying to use fsSource so w h a t e v e r
	vColor = mix(vColor, uFogColor, clamp(clamp(fogAmount, 0.0, uFogAmount)*uFogAmount*1.3, 0.0, 1.0));
}
`;
const lightColorTransfVS = `
attribute vec4 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec4 aColor;
attribute float aYRot; // rotate around (0,0,0)
attribute vec3 aTranslation; // translate da point

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;
uniform vec4 uFogColor;
uniform float uFogAmount;
uniform mat3 uLightingInfo; // 1st row is light direction, 2nd is color, 3rd is ambient light

varying lowp vec4 vColor;

vec4 rotate(vec4 pos, float rads) {
	return vec4(pos[2] * sin(rads) + pos[0] * cos(rads),
		pos[1],
		pos[2] * cos(rads) - pos[0] * sin(rads), 1.0);
}

void main() {
	vec4 transformed = rotate(aVertexPosition, aYRot);
	transformed.xyz += aTranslation;
	gl_Position = uProjectionMatrix * uModelViewMatrix * transformed;

	mediump float fogAmount = -(uModelViewMatrix * transformed).z * 0.05 - 0.3;
	highp vec4 transformedNormal = rotate(vec4(aVertexNormal.xyz, 1.0), aYRot);
	highp float directional = max(dot(transformedNormal.xyz, uLightingInfo[0]), 0.0);
	highp vec3 vLighting = uLightingInfo[2] + (uLightingInfo[1] * directional * 0.65);
	vColor = vec4(aColor.rgb * vLighting, aColor.a); // I really should mix it in the frag shader, but I'm trying to use fsSource so w h a t e v e r
	vColor = mix(vColor, uFogColor, clamp(clamp(fogAmount, 0.0, 1.0)*uFogAmount*1.0, 0.0, 1.0));
}
`;
const textureFS = `
precision mediump float;
varying highp vec2 texCoord;
varying highp vec3 vLighting;
uniform sampler2D uSampler;
uniform float uFogAmount;
uniform vec4 uFogColor;
varying mediump float fogAmount;
uniform float uAlphaAdj;

void main() {
	// if (gl_FragCoord.z < 0.0) {discard;}
	lowp vec4 col = texture2D(uSampler, texCoord);
	if (col.a < uAlphaAdj) {discard;}
	col = vec4(col.rgb * vLighting, col.a);
	col = mix(col, uFogColor, clamp(clamp(fogAmount, 0.0, uFogAmount)*uFogAmount, 0.0, 1.0));
	gl_FragColor = col;
	if (col.a == 0.0) {
		discard;
	}
}
`

const textureFS_t4 = `
precision mediump float;
varying highp vec2 texCoord1;
varying highp vec2 texCoord2;
varying highp vec2 texCoord3;
varying highp vec2 texCoord4;
varying highp vec4 mixFactor;
varying highp vec3 vLighting;
uniform sampler2D uSampler1;
uniform sampler2D uSampler2;
uniform sampler2D uSampler3;
uniform sampler2D uSampler4;
uniform vec4 uFogColor;
uniform float uFogAmount;
varying mediump float fogAmount;

void main() {
	highp vec4 mf = mixFactor;
	float sum = mf.x + mf.y + mf.z + mf.w;
	mf.x /= sum; mf.y /= sum; mf.z /= sum; mf.w /= sum;
	//if (gl_FragCoord.z < 0.0) {discard;}
	lowp vec4 col = vec4(texture2D(uSampler1, texCoord1) * mf.x + texture2D(uSampler2, texCoord2) * mf.y +
		texture2D(uSampler3, texCoord3) * mf.z + texture2D(uSampler4, texCoord4) * mf.w);
	col = vec4(col.rgb * vLighting, col.a);
	col = mix(col, uFogColor, clamp(clamp(fogAmount, 0.0, uFogAmount)*uFogAmount, 0.0, 1.0));
	if (col.a == 0.0) {
		discard;
	} else {
		gl_FragColor = col;
	}
}
`
// 0.529, 0.808, 0.921, 1.0
const textureBillboardVS = /*not actually a texture*/`
attribute vec4 aBillboardPos;
attribute vec4 aColor;

uniform mat4 uProjectionMatrix;
uniform mat4 ubModelViewMatrix;

varying lowp vec4 vColor;
varying mediump float fogAmount;
varying lowp vec4 fogColor;
varying highp vec3 vLighting;

void main() {
	gl_Position = uProjectionMatrix * ubModelViewMatrix * aBillboardPos;
	vColor = aColor;
	fogAmount = 0.0;
	fogColor = vec4(0.0, 0.0, 0.0, 0.0);
	vLighting = vec3(1.0, 1.0, 1.0);
}
`;

const particleVS = `
attribute vec3 aParticleVelocity;
attribute vec3 aParticleCenterOffset;
attribute vec2 aParticleCorner;
attribute vec2 aParticleTexCoords;
attribute float aLifetime;

uniform vec3 uParticleEmitter;
uniform float uTime;
uniform float uStartTime;
uniform int uNumCycles;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying highp vec2 texCoord;
varying lowp float size;

void main() {
	if (
		(uTime - uStartTime) < aLifetime - mod(uStartTime, aLifetime)
		|| int((uTime - uStartTime) / aLifetime) > uNumCycles
	) {
		gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
		texCoord = vec2(1.0, 1.0);
		size = 0.0;
		return;
	}
	float time = mod(uTime, aLifetime);
	vec4 position = vec4(
		uParticleEmitter + aParticleCenterOffset + (time * aParticleVelocity), 1.0
	);
	vec3 rightVec = vec3(
      uModelViewMatrix[0].x, uModelViewMatrix[1].x, uModelViewMatrix[2].x
    );
	vec3 upVec = vec3(uModelViewMatrix[0].y, uModelViewMatrix[1].y, uModelViewMatrix[2].y);
	position.xyz += (rightVec * aParticleCorner.x) +
					(upVec * aParticleCorner.y);
	gl_Position = uProjectionMatrix * uModelViewMatrix * position;
	texCoord = aParticleTexCoords;
	size = (aLifetime - time) / aLifetime;
}
`;//uModelViewMatrix[0].y, uModelViewMatrix[1].y, uModelViewMatrix[2].y
const realBillboardVS = /*lmao*/`
attribute vec3 aCenterOffset;
attribute vec3 aCorner;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;
uniform mat3 uLightingInfo;

varying vec2 texCoord;
varying float fogAmount;
varying vec3 vLighting;

void main() {
	vec4 position = vec4(aCenterOffset, 1.0);
	vec3 right = vec3(uModelViewMatrix[0].x, uModelViewMatrix[1].x, uModelViewMatrix[2].x);
	vec3 up = vec3(uModelViewMatrix[0].y, uModelViewMatrix[1].y, uModelViewMatrix[2].y);
	position.xyz += (right * aCorner.x) + (up * aCorner.y);
	fogAmount = -(uModelViewMatrix * position).z * 0.05 - 0.3;
	texCoord = aTexCoord;
	vLighting = uLightingInfo[2] + (uLightingInfo[1] * 0.5 * 0.65);
	gl_Position = uProjectionMatrix * uModelViewMatrix * position;
}
`;
const particleFS = `
precision mediump float;
varying highp vec2 texCoord;
varying highp vec3 vLighting;
uniform sampler2D uSampler;
varying lowp float size;

void main() {
	if (gl_FragCoord.z < 0.0) {discard;}
	lowp vec4 col = texture2D(uSampler, texCoord);
	col.a *= size;
	if (col.a == 0.0) {
		discard;
	} else {
		gl_FragColor = col;
	}
}
`
const textVS = `
attribute vec4 aVertexPosition;
attribute vec2 aTexCoord;
attribute vec4 aTextColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;

varying highp vec2 texCoord;
varying mediump float fogAmount;
varying lowp vec4 vColor;

void main() {
	gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
	texCoord = aTexCoord;
	vColor = aTextColor;
	if (uCameraPos.y < 0.0) {
		fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.08;
	} else {
		fogAmount = -(uModelViewMatrix * aVertexPosition).z * 0.05 - 1.0;
	}
}
`;
const textFS = `
precision mediump float;
varying highp vec2 texCoord;
uniform sampler2D uSampler;
uniform vec4 uFogColor;
varying mediump float fogAmount;
varying lowp vec4 vColor;

void main() {
	lowp vec4 texel = texture2D(uSampler, texCoord);
	if (texel.a == 0.0) {
		discard;
	} else {
		lowp vec4 col = vec4(vColor.rgb, mix(vColor.a, texel.a, 0.5));
		gl_FragColor = mix(col, uFogColor, clamp(fogAmount, 0.0, 1.0));
	}
}
`;
