// imports ************************************************************************************************************
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as THREE from 'three';
import {
  BufferGeometry, Color,
  Mesh,
  MeshPhongMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Texture, TypedArray,
  WebGLRenderer,
} from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements AfterViewInit {
  constructor() {}

  // add viewchild for canvas
  @ViewChild('threeCanvas')
  private canvasRef!: ElementRef;
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private map!: Mesh<BufferGeometry, MeshPhongMaterial>;
  private physicsWorld!: CANNON.World;
  private cannonDebugger!: any;
  private cannonSphere!: CANNON.Body;
  private threeSphere!: Mesh<BufferGeometry, MeshPhongMaterial>;
  private terrainShape!: CANNON.ConvexPolyhedron;
  private cannonTerrain!: CANNON.Body;
  private directionalLight!: THREE.DirectionalLight;

  ngAfterViewInit(): void {
    // Setup scene
    this.createScene();
    // Setup physics world
    this.createPhysicsWorld();
    // Render Loop
    requestAnimationFrame((delay) => this.render(delay));
  }

  private createScene() {
    // Setup scene and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Add renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.nativeElement, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Add directional light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.directionalLight.position.set(-30, 100, -10);
    this.directionalLight.target.position.set(15, 30, 20);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.top = 1;
    this.scene.add(this.directionalLight);


    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    ambientLight.position.set(0, 0, 0);
    ambientLight.castShadow = true;
    this.scene.add(ambientLight);

    // Add texture loader for heightmap
    const loader = new THREE.TextureLoader();
    loader.load('assets/texture/HeightMap.jpg', (texture) => this.onTextureLoaded(texture));

    // Create THREE Sphere
    const sphereGeometry = new THREE.SphereGeometry(1);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    this.threeSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.threeSphere.castShadow = true;
    this.scene.add(this.threeSphere);

    // import custom Blender model
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('assets/models/simpleGolem.glb',  (gltf) =>{
      gltf.scene.scale.set(0.5, 0.5, 0.5);
      gltf.scene.position.set(15,5.3,10)
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).castShadow = true;
          (child as THREE.Mesh).receiveShadow = true;
          (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
            color: Color.NAMES.rosybrown,
          });
          gltf.scene.castShadow = true;
          }
        }
      )
      this.scene.add(gltf.scene);
    });

    // Add camera controls
    const controls = new OrbitControls(this.camera, this.canvasRef.nativeElement);
    const axisHelper = new THREE.AxesHelper(5);
    this.scene.add(axisHelper);
    const gridHelper = new THREE.GridHelper(20);
    this.scene.add(gridHelper);
    const CameraHelper = new THREE.CameraHelper(this.directionalLight.shadow.camera);
    this.scene.add(CameraHelper);
  }

  private createPhysicsWorld() {
    // Setup physics world
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    // Create CANNON Sphere
    this.cannonSphere = new CANNON.Body({
      mass: 3,
      shape: new CANNON.Sphere(1),
      position: new CANNON.Vec3(17.2, 10, 23),
    });

    // Add a Sphere to the physics world
    this.physicsWorld.addBody(this.cannonSphere);

    // Add debugger for physics world
    this.cannonDebugger = new (CannonDebugger as any)(this.scene, this.physicsWorld);
  }

  private render(delay: DOMHighResTimeStamp) {
    // render the scene
    this.renderer.render(this.scene, this.camera);
    // animate physics
    this.animate(delay);
    // loop
    requestAnimationFrame((delay) => this.render(delay));
  }

  private generateTerrain(imageData: ImageData) {
    // Create Buffer Arrays
    const indices: number[] = [];
    const vertices: number[] = [];
    const uvs: number[] = [];
    let highestY: number = 0;

    // Loop through image data and generate vertices and uvs
    for (let z = 0; z < imageData.height; z++) {
      for (let x = 0; x < imageData.width; x++) {
        let y = 0;
        // Calculate height
        y += imageData.data[(z * imageData.height + x) * 4] / 128;
        y += imageData.data[(z * imageData.height + x + 1) * 4] / 128;
        y += imageData.data[(z * imageData.height + x + 2) * 4] / 128;

        // check if y is a number
        if (isNaN(y)) {
          y = 0;
        }

        // set highest y
        if (highestY < y) {
          highestY = y;
        }

        // push vertices and uvs
        vertices.push(x, y, z);
        // Calculate UV coordinates
        uvs.push(x / (imageData.width - 1), z / (imageData.height - 1));
      }
    }

    // Loop through image data and generate indices
    for (let i = 0; i < imageData.height - 1; i++) {
      for (let j = 0; j < imageData.width - 1; j++) {
        const topLeft = j + i * imageData.width;
        const topRight = j + 1 + i * imageData.width;
        const bottomLeft = j + (i + 1) * imageData.width;
        const bottomRight = j + 1 + (i + 1) * imageData.width;

        // Upper triangles
        indices.push(topLeft, topRight, bottomLeft);
        // Lower triangles
        indices.push(topRight, bottomRight, bottomLeft);

      }
    }

    // Create geometry and material
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    // Calculate normals for normal mapping
    geometry.computeVertexNormals();

    // Create material
    const material = new THREE.MeshPhongMaterial({
      vertexColors: false,
      wireframe: false,
      flatShading: false,
      // normal map
      normalMap: new THREE.TextureLoader().load('assets/texture/NormalMapSample.jpg'),
      map: new THREE.TextureLoader().load('assets/texture/Sample.jpg'),
      side: THREE.BackSide,
    });

    // Create map mesh
    this.map = new THREE.Mesh(geometry, material);
    this.map.receiveShadow = true;
    this.map.position.set(0, 0, 0);
    this.map.castShadow = true;

    // Convert Three.js vertices to CANNON.Vec3
    const cannonVertices: CANNON.Vec3[] = [];
    for (let i = 0; i < vertices.length; i += 3) {
      cannonVertices.push(new CANNON.Vec3(vertices[i], vertices[i + 1], vertices[i + 2]));
    }

    // Create CANNON ConvexPolyhedron
    this.terrainShape = new CANNON.ConvexPolyhedron({
      vertices: cannonVertices,
      faces: this.chunkArray(indices, 3)
    });

    // Create CANNON Terrain Body
    this.cannonTerrain = new CANNON.Body({
      mass: 0,
      shape: this.terrainShape,
      position: new CANNON.Vec3(0, 0, 0),
    });

    // Add map to scene
    this.scene.add(this.map);
    // Add terrain to physics world
    this.physicsWorld.addBody(this.cannonTerrain);
  }

  private onTextureLoaded(texture: Texture) {
    // create canvas
    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;

    // draw texture on canvas
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.drawImage(texture.image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height);

    // calculate starting camera position
    this.camera.position.x = data.width / 2;
    this.camera.position.y = data.height / 1.5;
    this.camera.position.z = data.width;
    this.camera.lookAt(data.width / 2, 0, data.width / 2);

    // generate terrain
    this.generateTerrain(data);
  }

  private chunkArray(array: number[], chunkSize: number): number[][] {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }

  private convertToThreeVector(cannonVector: CANNON.Vec3): THREE.Vector3 {
    return new THREE.Vector3(cannonVector.x, cannonVector.y, cannonVector.z);
  }

  private convertToThreeQuaternion(cannonQuaternion: CANNON.Quaternion): THREE.Quaternion {
    return new THREE.Quaternion(
      cannonQuaternion.x,
      cannonQuaternion.y,
      cannonQuaternion.z,
      cannonQuaternion.w
    );
  }

  private animate(delay: DOMHighResTimeStamp) {
    // update physics
    this.physicsWorld.step(1 / 60);

    // shows physics meshes
    // this.cannonDebugger.update();

    // update Objects ************************************************************************************

    // directional light
    const radius = 50;
    const speed = 0.5;
    const time = delay * 0.001 * speed;

    const dLightX = Math.cos(time) * radius;
    const dLightZ = Math.sin(time) * radius;

    this.directionalLight.position.set(dLightX, -10, dLightZ);


    // sphere
    if(this.cannonSphere.position.y < -5 || this.cannonSphere.velocity.y < 0.01 && this.cannonSphere.velocity.y > 0 && this.cannonSphere.velocity.x <0.05  && this.cannonSphere.velocity.z <0.05 ){
      const randomX = Math.random() * 32;
      const randomZ = Math.random() * 32;
      this.cannonSphere.position.set(randomX, 10, randomZ);
      this.cannonSphere.velocity.set(0,0,0);
    }

    // link and update THREE Objects to CANNON Objects **************************************************************
    this.threeSphere.position.copy(this.convertToThreeVector(this.cannonSphere.position));
    this.threeSphere.quaternion.copy(this.convertToThreeQuaternion(this.cannonSphere.quaternion));

  }
}
