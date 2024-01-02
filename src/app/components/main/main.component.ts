// imports ************************************************************************************************************
import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as THREE from "three";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";

import {
  BufferGeometry,
  Mesh,
  MeshBasicMaterial, MeshPhongMaterial,
  Object3DEventMap, PerspectiveCamera,
  Scene, Texture,
  WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})

export class MainComponent implements AfterViewInit {

  constructor() {}

  // add viewchild for canvas
  @ViewChild('threeCanvas')

// fields ***********************************************************************************************************
  private canvasRef!: ElementRef;
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private map!: Mesh<BufferGeometry, MeshPhongMaterial>
  private physicsWorld!: CANNON.World;
  private cannonDebugger!: any;

  ngAfterViewInit(): void {
    // Setup scene
    this.createScene();
    // Render Loop
    requestAnimationFrame((delay) => this.render(delay));
  }

  private createScene() {

    // Setup scene and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Add renderer
    this.renderer = new THREE.WebGLRenderer({canvas: this.canvasRef.nativeElement, alpha: true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);

    // Add camera controls
    const controls = new OrbitControls(this.camera, this.canvasRef.nativeElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Add texture loader for heightmap
    const loader = new THREE.TextureLoader();
    loader.load('assets/texture/HeightMap.jpg', (texture) => this.onTextureLoaded(texture));


  }

  private createPhysicsWorld() {

    // Setup physics world
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    // Add a Sphere to the physics world
    this.physicsWorld.addBody(new CANNON.Body({
      mass: 1,
      shape: new CANNON.Sphere(1),
      position: new CANNON.Vec3(0, 10, 0),
    }));

    // Add debugger for physics world
    this.cannonDebugger = new (CannonDebugger as any)(this.scene, this.physicsWorld)
  }


  private render(delay: DOMHighResTimeStamp) {
    // render the scene
    this.renderer.render(this.scene, this.camera)
    // animate physics
    this.animate();
    // loop
    requestAnimationFrame((delay) => this.render(delay))
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
        indices.push(bottomLeft, topRight, topLeft);
        // Lower triangles
        indices.push(bottomLeft, bottomRight, topRight);
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
      // for double sided rendering
      side: THREE.DoubleSide,
    });

    // Create map mesh
    this.map = new THREE.Mesh(geometry, material);
    this.map.receiveShadow = true;
    // Add map to scene
    this.scene.add(this.map);
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

  private animate() {
    // update physics
    this.physicsWorld.fixedStep();
    this.cannonDebugger.update();
  }

}
