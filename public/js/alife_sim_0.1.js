var create_world = function(view_el, res_data, org_data) {
	var socket = io.connect('http://localhost');
	var num_connected = 1;
	var prob_migration = 0.1;
	var mut_rate = 0.1;

	var serialized_org = null;

	var color_scheme = _.sample(colorbrewer);
	var color_scheme_idx = Object.keys(color_scheme).length;
	color_scheme = color_scheme[color_scheme_idx.toString()];

	// First, checks if it isn't implemented yet.
	if (!String.prototype.format) {
		String.prototype.format = function() {
			var args = arguments;
			return this.replace(/{(\d+)}/g, function(match, number) { 
			return typeof args[number] != 'undefined'
				? args[number]
				: match
		  	;
			});
		};
	};

	function normRand() {
		var x1, x2, rad;
	 
		do {
			x1 = 2 * Math.random() - 1;
			x2 = 2 * Math.random() - 1;
			rad = x1 * x1 + x2 * x2;
		} while(rad >= 1 || rad == 0);
	 
		var c = Math.sqrt(-2 * Math.log(rad) / rad);
	 
		return x1 * c;
	};


	function hex_to_rgb(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	};

	function rbg_to_hex(r, g, b) {
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	};

	var get_random_color = function() {
		var col = _.sample(color_scheme);
		return(col);
	};


	var min_max = function(val) {
		return( Math.max(Math.min(val, 255), 0) ); 
	};

	var mutate_color = function(hex_color) {
		rgb_obj = hex_to_rgb(hex_color);
		var rnd = Math.random();
		console.log(Math.round(normRand()*10));
		if (rnd < 1/3.0){
			//mutate r
			rgb_obj.r += Math.round(normRand()*10);
		} else if (rnd < 2/3) {
			//mutate g
			rgb_obj.g += Math.round(normRand()*10);
		} else {
			//mutate b
			rgb_obj.b += Math.round(normRand()*10);
		};
		return(rbg_to_hex(min_max(rgb_obj.r), min_max(rgb_obj.g), min_max(rgb_obj.b)));
	};

	socket.on('num_connected_response', function(data) {
		num_connected = data.connections;
		console.log(num_connected);
	});


	return function() { 
		var circ;
		var orgs = {};
		var g_world;
		var cm;
		var org_index = 0;
		var pop_size = 30;
		var mutated = false;

		Physics(function(world){

			g_world = world;
			var viewWidth = 500;
			var viewHeight = 300;

		  var renderer = Physics.renderer('canvas', {
			el: view_el,
			width: viewWidth,
			height: viewHeight,
			meta: false, // don't display meta data
			styles: {
				// set colors for the circle bodies
				'circle' : {
					strokeStyle: 'rgb(0,0,0)',
					lineWidth: 1,
					fillStyle: 'hsla(60, 37%, 57%, 0.8)',
					angleIndicator: 'hsla(60, 37%, 17%, 0.4)'
				}
			}
		  });


		// add the renderer
		world.add( renderer );
		// render on each step
		world.subscribe('step', function(){
			world.render();
		});
		
		// bounds of the window
		var viewportBounds = Physics.aabb(0, 0, viewWidth, viewHeight);
		cm = Physics.behavior('verlet-constraints');

		var add_org = function(num_wheels, p_parent_id) {
			org_index += 1;
			var this_org_constraints = [];
			var rnd = Physics.util.random;
			var random_color = get_random_color();

			var circles = [];
			for (var i=0; i< num_wheels; i++){
				var circ = Physics.body('circle', {
					x: Math.random()*viewWidth, // x-coordinate
					y: Math.random()*viewHeight, // y-coordinate
					vx: (Math.random()-0.5)/2, // velocity in x-direction
					restitution: 0.0,
					cof: 0.8,
					id: "test",
					radius: Math.random()*15
				  });

				circ.color = random_color;
				circ.sim_type = "org";
				circ.just_migrated = false;
				circ.org_id = org_index;
				circles.push(circ);

				world.add(circ);
			};

			cm.org_id = org_index;

			for (var i=0; i< num_wheels; i++){
				for (var j=i; j< num_wheels; j++){
					var d = cm.distanceConstraint(circles[i], circles[j], 0.3, Math.random() * 20);
					d.idxs = [i,j];
					d.sim_type = "org";
					this_org_constraints.push(d);
				};
			};
			world.add(circ);
			world.add(cm);

			orgs[org_index] = {org: circles, fit: 0, constraints: this_org_constraints, parent_id: p_parent_id};
		}

		for (var i=0; i< pop_size ;i++){
			add_org(4, 0);
		}



		// ensure objects bounce when edge collision is detected
		world.add( Physics.behavior('body-impulse-response') );
		var rigidConstraints = Physics.behavior('rigid-constraint-manager', {
					targetLength: 20
				});
		world.add( Physics.behavior('edge-collision-detection', {
			aabb: viewportBounds,
			restitution: 0.1,
			cof: 0.8
		}) );

		// add some gravity
		world.add( Physics.behavior('constant-acceleration') );




		var remove_org = function(org) {
			_.forEach(orgs[org.org_id].org, function(bod, bod_idx, bods) {
				world.remove(bod);
			});

			_.forEach(orgs[org.org_id].constraints, function(cnst, cnst_idx, cnsts) {
				cm.remove(cnst.id);
			});

			delete orgs[org.org_id];
		};

		var mutate_circle = function(circle) {
			//size
			mutated = true;

			if(Math.random() < 0.3){
				circle.options.radius = Math.min(Math.max(circle.options.radius + normRand()*10, 1), 150);
			};
			//rotation
			if(Math.random() < 0.3) {
				//circle.options.vx = Math.max(Math.min(circle.options.vx + normRand()/5, 1),0);
			};

			//color??
			return circle;
		};

		//TODO
		var serialize_org = function(org) {
			serialized_org = {org:[], constraints:[]};
			
			var color = org.org[0].color;

			for (circ in org.org) {
				//console.log(org.org[circ].options)
				var temp_c = org.org[circ].options;
				temp_c.color = org.org[circ].color;
				serialized_org.org.push(temp_c);
			};
			//what data do I need about circles?
			//[c.options, color]

			//what data do I need about constraints?
			for (con in org.constraints) {
				serialized_org.constraints.push(
				{	targetLength:org.constraints[con].targetLength,
					idxs:org.constraints[con].idxs,
					stiffness:org.constraints[con].stiffness 
				});
			};

			return(serialized_org);
		};

		var add_serialized_org = function(serialized_org) {
			var rnd = Physics.util.random;
			var random_color = get_random_color();
			//console.log(serialized_org);
			org_index +=1;
			var this_org = [];
			var this_org_constraints = [];

			//console.log(serialized_org)
			_.forEach(serialized_org.org, function(c, c_idx, cs) {
				var temp_c = Physics.body('circle', {
					x: Math.random()*viewWidth, // x-coordinate
					y: Math.random()*viewHeight, // y-coordinate
					vx: c.vx, // velocity in x-direction
					restitution: c.restitution,
					cof: c.cof,
					id: "test",
					radius: c.radius
				  });
				temp_c.just_migrated = true;
				temp_c.org_id = org_index;
				temp_c.color=c.color;
				temp_c.sim_type = "org";

				this_org.push(temp_c);
				world.add(temp_c);
			});

			_.forEach(serialized_org.constraints, function(c, c_i, cs){
				var d = cm.distanceConstraint(this_org[c.idxs[0]], this_org[c.idxs[1]], c.stiffness, c.targetLength);
				d.idxs = c.idxs;
				d.sim_type = "org";
				this_org_constraints.push(d);
			});
			world.add(cm);
			orgs[org_index] = {org: this_org, fit:0, constraints:this_org_constraints, parent_id: -2};
			world.subscribe('render', redraw_migrated_orgs, null, 100);
		};


		var replicate_org = function(org, mut_rate) {
			org_index += 1;
			var circles = orgs[org.org_id].org;
			var circle_constraints = orgs[org.org_id].constraints;


			var new_color = mutate_color(circles[0].color);
			var this_org = [];
			var this_org_constraints = [];

			_.forEach(circles, function(c, c_idx, cs) {
				var temp_c = Physics.body('circle', c.options);
				temp_c.org_id = org_index
				temp_c.color = new_color;
				temp_c.sim_type = c.sim_type;
				temp_c.just_migrated = false;

				if(Math.random() < mut_rate){
					temp_c = mutate_circle(temp_c);

				};
				this_org.push(temp_c);
				world.add(temp_c);
			});

			_.forEach(circle_constraints, function(c, c_i, cs) {
				var length = c.targetLength;
				if(Math.random() < mut_rate) {
					mutated = true;
					length += normRand()*5;
					length = Math.min(Math.max(length, 30), 2);
				};

				var d = cm.distanceConstraint(this_org[c.idxs[0]], this_org[c.idxs[1]], 0.3, length);
				d.idxs = c.idxs;
				d.sim_type = c.sim_type;
				this_org_constraints.push(d);
			});
			world.add(cm);
			orgs[org_index] = {org: this_org, fit: 0, constraints: this_org_constraints, parent_id: org.org_id}
			world.subscribe('render', redraw_orgs, null, 100);
		};

		
		$('#' + view_el).click(function(e) {
			var mousePos = Physics.vector();
			var offset = $('#' + view_el).offset();
			mousePos.set(e.pageX - offset.left, e.pageY - offset.top);

			var body = world.findOne({ $at: mousePos });

			if(body) {
				if(body.sim_type == "food") {
					world.remove(body);
					return;
				};
			}

			add_food_source(mousePos);
			return;

		})

		var add_food_source = function(mouse_pos) {
			var food = Physics.body('convex-polygon', {x:mouse_pos.get(0), y:mouse_pos.get(1), fixed: true, 
				vertices: [
					{ x: 0, y: 0 },
					{ x: 0, y: 20 },
					{ x: 20, y: 20 },
					{ x: 20, y: 0 }
				]
			});

			food.sim_type = "food";
			food.collide = function(other) {
				if (other && other.sim_type=="org") {
					orgs[other.org_id].fit += 1;
				} ;
			};

			world.add(food);
			return food;
		};

		if (res_data) {
			var offset = $('#' + view_el).offset();
			_.forIn(res_data, function(res) {
				add_food_source(Physics.vector(res.x, res.y))
			});
		};

		// If extending a body and you want to handle its collision
		world.subscribe('collisions:detected', function( data ){
			var c;
			for (var i = 0, l = data.collisions.length; i < l; i++){
				c = data.collisions[ i ];
				if ( c.bodyA.collide ){
					c.bodyA.collide( c.bodyB );
				}
				if ( c.bodyB.collide ){
					c.bodyB.collide( c.bodyA );
				}
			}
		});

		// mixin to the base body class. Adds a method to all bodies.
		Physics.body.mixin('collide', function( other ){
			if ( other ){
				// do some default action
			}
			return true;
		});

		var redraw_migrated_orgs = function(data) {
			var migrated_circles = _.filter(_.flatten(_.pluck(orgs, 'org')), 'just_migrated');
			console.log(migrated_circles);

			//color migrated circles
			Physics.util.each(migrated_circles, function(circle) {
				// neon pink - #FF6EC7
				var geo = circle.geometry
					,style = {fillStyle: '#FF00FF', strokeStyle: 'white', angleIndicator: 'white'};

				circle.view = data.renderer.createView( geo, style );
				circle.just_migrated = false;
			});
			//set migrated flag = false

			//delay on rendering correctly...


			world.unsubscribe( data.topic, data.handler );
			setTimeout(function() {world.subscribe('render', redraw_orgs, null, 100); }, 1000);

		};

		var redraw_orgs = function(data) {
			//TODO
			var all_circles = _.flatten(_.pluck(orgs, 'org'));

			Physics.util.each( all_circles, function( circle ){

				var geo = circle.geometry
					,style = {fillStyle: circle.color, strokeStyle: 'white', angleIndicator: 'white'};

				circle.view = data.renderer.createView( geo, style );
			});

			// only run once
			world.unsubscribe( data.topic, data.handler );
		};

		// custom view creation
		world.subscribe('render', redraw_orgs, null, 100);

			setInterval(function() { socket.emit('num_connected'); }, 5000);

		socket.on('send_org', function(data) {
			console.log("getting org!");
			serialized_org = data;
			add_serialized_org(serialized_org);

		});

		var do_update = function(k, num_to_replace) {
			mutated = false;
			var tourny_winner = {};

			var to_remove = _.sample(orgs, num_to_replace);
			_.forEach(to_remove, function(org) {
				remove_org(org.org[0]);
			});

			for (var i=0; i< num_to_replace; i++){
				//should we replace this org with a migrated one instead?
				if (num_connected > 1 && Math.random() < prob_migration && serialized_org){
					socket.emit('get_org');
				} else {
					var tourny = _.sample(orgs, k);
					tourny_winner = tourny[0];
					_.forEach(tourny, function(org, org_idx, tourny_orgs) {
						if(org.fit >= tourny_winner.fit) {
							tourny_winner = org;
						};
					});
					replicate_org(tourny_winner.org[0], 0.1);
					socket.emit('save_org', serialize_org(tourny_winner));

				};
	
			};
		};

		var bcd = Physics.behavior('body-collision-detection');
		var sp = Physics.behavior('sweep-prune');

		world.add(bcd);
		world.add(sp);

		// subscribe to ticker to advance the simulation
		var timer_reset = 100;
		Physics.util.ticker.subscribe(function( time, dt ){
				world.step( time );

				timer_reset -= 1;
				if (timer_reset == 0)
				{
					timer_reset = 100;
					do_update(4, 1);
				}
		});
		// start the ticker
		Physics.util.ticker.start();
		});	
	};
};


$(document).ready( function() {
	var resources = [];

	for(var i=15; i < 500; i+= 80) {
		resources.push({x: i, y:Math.random() * 300});
	};

	setTimeout(create_world("viewport1", resources, null), 100);
});

